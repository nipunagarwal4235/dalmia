package com.dalmiahardware.catalog

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

// Starts from the bundled catalog, then the last download; refresh() runs every minute.
class CatalogStore(context: Context) {
    private val cache = File(context.cacheDir, "dalmia-catalog-v1.json")
    var catalog by mutableStateOf(
        runCatching { parseCatalog(cache.readText()) }.getOrNull()
            ?: parseCatalog(context.assets.open("catalog.json").bufferedReader().use { it.readText() })
            ?: Catalog(emptyList(), emptyList(), "")
    )
        private set

    suspend fun refresh() {
        // Keep the last usable catalog when the device is offline.
        val json = runCatching { Supabase.send("rest/v1/rpc/get_catalog", JSONObject().put("include_pages", false)) }.getOrNull() ?: return
        val fresh = withContext(Dispatchers.Default) { parseCatalog(json) } ?: return
        catalog = fresh
        withContext(Dispatchers.IO) { runCatching { cache.writeText(json) } }
    }
}

// Guests keep saves on the device. Accounts keep a local copy plus a queue of changes to send.
class SavedStore(context: Context) {
    private val prefs = context.getSharedPreferences("dalmia-saved", Context.MODE_PRIVATE)
    private val guestKey = "dalmia-mobile-likes-v1"
    private var user: String? = null
    private var pending = LinkedHashMap<String, Boolean>()
    private var generation = 0
    private var running = false
    private val key get() = user?.let { "dalmia-saved-account-$it" } ?: guestKey

    var saved by mutableStateOf(emptySet<String>()); private set
    var ready by mutableStateOf(false); private set
    var error by mutableStateOf(""); private set
    var signedIn by mutableStateOf(false); private set

    fun changeUser(next: String?) {
        if (ready && user == next) return
        generation++
        user = next
        running = false
        signedIn = next != null
        error = ""
        pending = LinkedHashMap()
        val raw = prefs.getString(key, null)
        if (next != null) {
            val stored = runCatching { JSONObject(raw ?: "{}") }.getOrDefault(JSONObject())
            saved = stored.optJSONArray("ids")?.strings()?.toSet() ?: emptySet()
            stored.optJSONObject("pending")?.let { queue -> queue.keys().forEach { pending[it] = queue.getBoolean(it) } }
        } else {
            saved = runCatching { JSONArray(raw ?: "[]").strings().toSet() }.getOrDefault(emptySet())
        }
        ready = true
    }

    fun set(id: String, selected: Boolean) {
        if (!ready) return
        saved = if (selected) saved + id else saved - id
        if (user != null) pending[id] = selected
        persist()
    }

    fun guestSaves() = runCatching { JSONArray(prefs.getString(guestKey, null) ?: "[]").strings() }.getOrDefault(emptyList())

    private fun persist() {
        val value = if (user != null) JSONObject().put("ids", JSONArray(saved.toList())).put("pending", JSONObject(pending as Map<*, *>)) else JSONArray(saved.toList())
        prefs.edit().putString(key, value.toString()).apply()
    }

    suspend fun sync() {
        val owner = user ?: return
        if (!ready || running) return
        val token = generation
        running = true
        try {
            if (Supabase.currentSession()?.userId != owner || token != generation) return
            for ((id, value) in pending.toList()) {
                try {
                    Supabase.rpc("set_saved_product", JSONObject().put("product", id).put("saved", value))
                } catch (error: ApiException) {
                    if (error.code != "23503") throw error // 23503: the product no longer exists.
                }
                if (token != generation) return
                if (pending[id] == value) pending.remove(id)
                persist()
            }
            val ids = Supabase.rpc("get_saved_products").let { if (it.isBlank() || it == "null") emptyList() else JSONArray(it).strings() }
            if (token != generation) return
            saved = ids.toSet() + pending.filterValues { it }.keys - pending.filterValues { !it }.keys
            error = ""
            persist()
        } catch (failure: Exception) {
            if (token == generation) error = "Saved changes are on this device. Sync will retry when your connection and account access are available."
        } finally {
            if (token == generation) running = false
        }
    }
}

data class AccessContext(val id: String, val displayName: String, val company: String, val active: Boolean, val roles: List<String>, val permissions: List<String>) {
    fun can(permission: String) = active && permission in permissions
}

fun parseAccess(json: String): AccessContext? = runCatching {
    val o = JSONObject(json)
    AccessContext(o.getString("id"), o.getString("displayName"), o.getString("company"), o.getBoolean("active"), o.getJSONArray("roles").strings(), o.getJSONArray("permissions").strings())
}.getOrNull()

fun roleLabel(role: String) = role.split("_").joinToString(" ") { it.replaceFirstChar(Char::uppercase) }

fun JSONArray.strings() = List(length()) { optString(it) }.filter { it.isNotEmpty() }
