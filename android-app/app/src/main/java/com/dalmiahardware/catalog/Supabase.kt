package com.dalmiahardware.catalog

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.net.URLEncoder
import java.security.KeyStore
import java.util.concurrent.TimeUnit
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

const val SITE_URL = "https://dalmia-blush.vercel.app"

class ApiException(message: String, val code: String? = null, val status: Int = 0) : Exception(message)

data class Session(val accessToken: String, val refreshToken: String, val expiresAt: Double, val userId: String, val email: String?)

// Talks to Supabase Auth and PostgREST over HTTP. The session is encrypted with an Android Keystore key.
object Supabase {
    private val url = BuildConfig.SUPABASE_URL
    private val key = BuildConfig.SUPABASE_PUBLISHABLE_KEY
    private val http = OkHttpClient.Builder().callTimeout(10, TimeUnit.SECONDS).build()
    private val refreshLock = Mutex()
    private lateinit var prefs: SharedPreferences

    var session by mutableStateOf<Session?>(null)
        private set

    fun init(context: Context) {
        prefs = context.getSharedPreferences("dalmia-auth", Context.MODE_PRIVATE)
        session = runCatching { prefs.getString("session", null)?.let { parseSession(JSONObject(Vault.decrypt(it))) } }.getOrNull()
    }

    suspend fun send(path: String, body: JSONObject? = null, method: String = "POST", token: String? = null, headers: Map<String, String> = emptyMap()): String =
        withContext(Dispatchers.IO) {
            if (url.isEmpty() || key.isEmpty()) throw ApiException("Set the Supabase URL and publishable key.")
            val request = Request.Builder().url("$url/$path").header("apikey", key)
                .method(method, (body ?: JSONObject()).toString().toRequestBody("application/json".toMediaType()))
            if (token != null) request.header("Authorization", "Bearer $token")
            headers.forEach { (name, value) -> request.header(name, value) }
            http.newCall(request.build()).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val json = runCatching { JSONObject(text) }.getOrNull()
                    val message = listOf("msg", "message", "error_description").firstNotNullOfOrNull { json?.optString(it)?.takeIf(String::isNotEmpty) }
                    val code = listOf("code", "error_code").firstNotNullOfOrNull { json?.opt(it)?.toString() }
                    throw ApiException(message ?: "Request failed (${response.code}).", code, response.code)
                }
                text
            }
        }

    suspend fun rpc(name: String, body: JSONObject = JSONObject()) = send("rest/v1/rpc/$name", body, token = currentSession()?.accessToken)

    // Returns a usable session, refreshing tokens that expire within a minute.
    suspend fun currentSession(): Session? = refreshLock.withLock {
        val current = session ?: return@withLock null
        if (current.expiresAt - 60 > System.currentTimeMillis() / 1000.0) return@withLock current
        try {
            token("refresh_token", JSONObject().put("refresh_token", current.refreshToken))
        } catch (error: ApiException) {
            if (error.status !in 400..401) throw error
            store(null)
            null
        }
    }

    suspend fun signIn(email: String, password: String) {
        token("password", JSONObject().put("email", email).put("password", password))
    }

    // Returns false when the new account must confirm its email first.
    suspend fun signUp(email: String, password: String, name: String): Boolean {
        val body = JSONObject().put("email", email).put("password", password).put("data", JSONObject().put("display_name", name))
        val next = parseSession(JSONObject(send("auth/v1/signup?redirect_to=$redirect", body))) ?: return false
        store(next)
        return true
    }

    suspend fun resetPassword(email: String) {
        send("auth/v1/recover?redirect_to=$redirect", JSONObject().put("email", email))
    }

    suspend fun signOut() {
        session?.let { runCatching { send("auth/v1/logout", token = it.accessToken) } }
        store(null)
    }

    // Removes the account, profile, roles, and saved products on the server.
    suspend fun deleteAccount() {
        rpc("delete_own_account")
        store(null)
    }

    private val redirect =URLEncoder.encode("$SITE_URL/auth/mobile", "UTF-8")

    private suspend fun token(grant: String, body: JSONObject): Session {
        val next = parseSession(JSONObject(send("auth/v1/token?grant_type=$grant", body))) ?: throw ApiException("Sign-in is unavailable. Try again.")
        store(next)
        return next
    }

    private fun store(next: Session?) {
        session = next
        val json = next?.let {
            JSONObject().put("access_token", it.accessToken).put("refresh_token", it.refreshToken).put("expires_at", it.expiresAt)
                .put("user", JSONObject().put("id", it.userId).put("email", it.email ?: JSONObject.NULL))
        }
        prefs.edit().apply { if (json == null) remove("session") else putString("session", Vault.encrypt(json.toString())) }.apply()
    }

    private fun parseSession(json: JSONObject): Session? {
        val user = json.optJSONObject("user") ?: return null
        if (!json.has("access_token") || !json.has("refresh_token") || !user.has("id")) return null
        val expiresAt = if (json.has("expires_at")) json.getDouble("expires_at") else System.currentTimeMillis() / 1000.0 + json.optDouble("expires_in", 3600.0)
        return Session(json.getString("access_token"), json.getString("refresh_token"), expiresAt, user.getString("id"), user.optString("email").takeIf { !user.isNull("email") })
    }
}

private object Vault {
    private const val ALIAS = "dalmia-session"

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(
                KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build()
            )
        }.generateKey()
    }

    fun encrypt(text: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        return Base64.encodeToString(cipher.iv + cipher.doFinal(text.toByteArray()), Base64.NO_WRAP)
    }

    fun decrypt(value: String): String {
        val bytes = Base64.decode(value, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes, 0, 12)) }
        return String(cipher.doFinal(bytes, 12, bytes.size - 12))
    }
}
