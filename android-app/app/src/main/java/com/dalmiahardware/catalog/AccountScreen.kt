package com.dalmiahardware.catalog

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.TextButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

private enum class Mode { Login, Signup, Reset }

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AccountScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val session = Supabase.session
    var access by remember { mutableStateOf<AccessContext?>(null) }
    var loading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf("") }
    var mode by remember { mutableStateOf(Mode.Login) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    // Reloads permissions when the account changes and every minute after that.
    LaunchedEffect(session?.userId) {
        access = null
        loading = true
        loadError = ""
        while (true) {
            try {
                if (Supabase.currentSession() != null) {
                    access = parseAccess(Supabase.rpc("get_access_context"))
                    if (access == null) loadError = "Your account permissions are unavailable."
                }
            } catch (error: ApiException) {
                loadError = error.message.orEmpty()
            } catch (error: java.io.IOException) {
                loadError = "Your account is unavailable."
            }
            loading = false
            delay(60_000)
        }
    }

    fun submit() = scope.launch {
        busy = true
        message = ""
        val address = email.trim()
        try {
            when (mode) {
                Mode.Signup -> {
                    if (password.length < 12) throw ApiException("Use at least 12 characters for your password.")
                    if (!Supabase.signUp(address, password, name.trim())) message = "Confirm your email, then return here to sign in."
                }
                Mode.Reset -> {
                    Supabase.resetPassword(address)
                    message = "If an account exists, you will receive a password reset email."
                }
                Mode.Login -> Supabase.signIn(address, password)
            }
            password = ""
        } catch (error: ApiException) {
            message = error.message.orEmpty()
        } catch (error: java.io.IOException) {
            message = "Sign-in is unavailable. Try again."
        }
        busy = false
    }

    Column(Modifier.verticalScroll(rememberScrollState()).padding(start = 24.dp, end = 24.dp, top = 24.dp, bottom = 60.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("DALMIA ACCOUNT", style = style(10, Palette.gold, spacing = 2f))
        if (loading) {
            CircularProgressIndicator(color = Palette.gold)
        } else if (session != null) {
            Text(access?.displayName ?: "Your account", style = style(28, Color.White, FontWeight.SemiBold))
            Text(session.email.orEmpty(), style = style(14, Color(0xFFBBBBBB), lineHeight = 22))
            Text(access?.roles?.joinToString(" · ", transform = ::roleLabel).orEmpty(), style = style(14, Palette.gold))
            access?.let { current ->
                if (!current.active) MessageText("Your account is disabled. Contact your administrator.")
                androidx.compose.runtime.key(current.id) { ProfileForm(current) }
                if (current.can("users.manage") || current.can("catalog.manage") || current.can("catalog.assigned.manage")) {
                    SecondaryButton("Open management on the website") {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("$SITE_URL/${if (current.can("users.manage")) "admin" else "manage"}")))
                    }
                }
            }
            PrimaryButton("Sign out", busy) { scope.launch { busy = true; Supabase.signOut(); busy = false } }
            SecondaryButton("Delete account", busy) { confirmDelete = true }
            if (confirmDelete) AlertDialog(
                onDismissRequest = { confirmDelete = false },
                title = { Text("Delete your account?") },
                text = { Text("Your profile and saved products are removed permanently.") },
                confirmButton = {
                    TextButton({
                        confirmDelete = false
                        scope.launch {
                            busy = true
                            message = ""
                            try { Supabase.deleteAccount() } catch (error: ApiException) { message = error.message.orEmpty() } catch (error: java.io.IOException) { message = "Account deletion is unavailable. Try again." }
                            busy = false
                        }
                    }) { Text("Delete account", color = Color(0xFFE5735F)) }
                },
                dismissButton = { TextButton({ confirmDelete = false }) { Text("Cancel") } },
            )
        } else {
            Text(if (mode == Mode.Signup) "Create your account" else if (mode == Mode.Reset) "Reset password" else "Welcome back", style = style(28, Color.White, FontWeight.SemiBold))
            Text("Use the same account on the website and mobile app.", style = style(14, Color(0xFFBBBBBB), lineHeight = 22))
            if (mode == Mode.Signup) Field("Name", name, { name = it.take(120) })
            Field("Email", email, { email = it }, KeyboardType.Email)
            if (mode != Mode.Reset) Field("Password", password, { password = it }, KeyboardType.Password)
            if (mode == Mode.Signup) Text("Use at least 12 characters. New accounts start as customers.", style = style(14, Color(0xFFBBBBBB), lineHeight = 22))
            PrimaryButton(
                if (busy) "Please wait…" else if (mode == Mode.Signup) "Create account" else if (mode == Mode.Reset) "Send reset link" else "Sign in",
                busy || email.isEmpty() || (mode != Mode.Reset && password.isEmpty()),
            ) { submit() }
            FlowRow(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                if (mode != Mode.Login) ModeLink("Sign in") { mode = Mode.Login }
                if (mode != Mode.Signup) ModeLink("Create account") { mode = Mode.Signup }
                if (mode != Mode.Reset) ModeLink("Forgot password?") { mode = Mode.Reset }
            }
        }
        val shown = message.ifEmpty { loadError }
        if (shown.isNotEmpty()) MessageText(shown)
    }
}

@Composable
private fun ProfileForm(access: AccessContext) {
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf(access.displayName) }
    var company by remember { mutableStateOf(access.company) }
    var message by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Field("Name", name, { name = it.take(120) })
        Field("Company", company, { company = it.take(160) })
        SecondaryButton("Save profile", !access.can("profile.update") || busy) {
            scope.launch {
                busy = true
                message = try {
                    val rows = Supabase.send(
                        "rest/v1/profiles?id=eq.${access.id}&select=id", JSONObject().put("display_name", name.trim()).put("company", company.trim()),
                        method = "PATCH", token = Supabase.currentSession()?.accessToken, headers = mapOf("Prefer" to "return=representation"),
                    )
                    if (JSONArray(rows).length() > 0) "Profile saved." else "Your account cannot edit this profile."
                } catch (error: ApiException) {
                    error.message.orEmpty()
                } catch (error: java.io.IOException) {
                    "Profile save failed."
                }
                busy = false
            }
        }
        if (message.isNotEmpty()) MessageText(message)
    }
}

@Composable
private fun Field(label: String, value: String, onChange: (String) -> Unit, type: KeyboardType = KeyboardType.Text) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, Modifier.padding(top = 12.dp), style = style(13, Color(0xFFDDDDDD)))
        BasicTextField(
            value, onChange,
            Modifier.fillMaxWidth().heightIn(min = 48.dp).background(Color(0xFF282828), RoundedCornerShape(5.dp))
                .border(1.dp, Color(0xFF555555), RoundedCornerShape(5.dp)).padding(13.dp).semantics { contentDescription = label },
            textStyle = style(16, Color.White), singleLine = true, cursorBrush = SolidColor(Palette.gold),
            keyboardOptions = KeyboardOptions(autoCorrectEnabled = false, keyboardType = type),
            visualTransformation = if (type == KeyboardType.Password) PasswordVisualTransformation() else VisualTransformation.None,
        )
    }
}

@Composable
private fun PrimaryButton(title: String, disabled: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.padding(top = 12.dp).fillMaxWidth().alpha(if (disabled) 0.6f else 1f).background(Palette.gold, RoundedCornerShape(5.dp))
            .clickable(enabled = !disabled, role = Role.Button, onClick = onClick).padding(15.dp),
        contentAlignment = Alignment.Center,
    ) { Text(title, style = style(14, Palette.black, FontWeight.Bold)) }
}

@Composable
private fun SecondaryButton(title: String, disabled: Boolean = false, onClick: () -> Unit) {
    Box(
        Modifier.padding(top = 16.dp).fillMaxWidth().alpha(if (disabled) 0.6f else 1f).border(1.dp, Color(0xFF555555), RoundedCornerShape(5.dp))
            .clickable(enabled = !disabled, role = Role.Button, onClick = onClick).padding(14.dp),
        contentAlignment = Alignment.Center,
    ) { Text(title, style = style(14, Color(0xFFBBBBBB))) }
}

@Composable
private fun ModeLink(title: String, onClick: () -> Unit) =
    Text(title, Modifier.clickable(role = Role.Button, onClick = onClick).padding(vertical = 8.dp), style = style(14, Palette.gold))

@Composable
private fun MessageText(text: String) = Text(text, style = style(14, Palette.notice, lineHeight = 22))
