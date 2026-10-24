import SwiftUI

struct AccountView: View {
    private let api = Supabase.shared
    @Environment(\.openURL) private var openURL
    @State private var access: AccessContext?
    @State private var loading = true
    @State private var loadError = ""
    @State private var mode = Mode.login
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var message = ""
    @State private var busy = false
    @State private var confirmDelete = false

    enum Mode { case login, signup, reset }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("DALMIA ACCOUNT").font(.system(size: 10)).tracking(2).foregroundStyle(Theme.gold)
                if loading {
                    ProgressView().tint(Theme.gold)
                } else if let session = api.session {
                    signedIn(session)
                } else {
                    signInForm
                }
                if !(message.isEmpty && loadError.isEmpty) { messageText(message.isEmpty ? loadError : message) }
            }
            .padding(24).padding(.bottom, 36).frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollDismissesKeyboard(.interactively)
        .task(id: api.session?.userID) { await loadAccess() }
    }

    // Reloads permissions when the account changes and every minute after that.
    private func loadAccess() async {
        access = nil
        loading = true
        loadError = ""
        while !Task.isCancelled {
            do {
                if try await api.currentSession() != nil {
                    access = try JSONDecoder().decode(AccessContext?.self, from: try await api.rpc("get_access_context"))
                    if access == nil { loadError = "Your account permissions are unavailable." }
                }
            } catch is CancellationError {
                return
            } catch {
                loadError = error.localizedDescription
            }
            loading = false
            try? await Task.sleep(for: .seconds(60))
        }
    }

    @ViewBuilder private func signedIn(_ session: Session) -> some View {
        Text(access?.displayName ?? "Your account").font(.system(size: 28, weight: .semibold)).foregroundStyle(.white)
        Text(session.email ?? "").font(.system(size: 14)).foregroundStyle(Color(0xBBBBBB))
        Text(access?.roles.map(roleLabel).joined(separator: " · ") ?? "").font(.system(size: 14)).foregroundStyle(Theme.gold)
        if let access {
            if !access.active { messageText("Your account is disabled. Contact your administrator.") }
            ProfileForm(access: access).id(access.id)
            if access.can("users.manage") || access.can("catalog.manage") || access.can("catalog.assigned.manage") {
                secondaryButton("Open management on the website") {
                    if let url = URL(string: "\(Config.siteURL)/\(access.can("users.manage") ? "admin" : "manage")") { openURL(url) }
                }
            }
        }
        primaryButton("Sign out", disabled: busy) {
            busy = true
            await api.signOut()
            busy = false
        }
        secondaryButton("Delete account", disabled: busy) { confirmDelete = true }
            .confirmationDialog("Delete your account?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete account", role: .destructive) {
                    Task {
                        busy = true
                        message = ""
                        do { try await api.deleteAccount() } catch { message = error.localizedDescription }
                        busy = false
                    }
                }
            } message: {
                Text("Your profile and saved products are removed permanently.")
            }
    }

    @ViewBuilder private var signInForm: some View {
        Text(mode == .signup ? "Create your account" : mode == .reset ? "Reset password" : "Welcome back").font(.system(size: 28, weight: .semibold)).foregroundStyle(.white)
        Text("Use the same account on the website and mobile app.").font(.system(size: 14)).foregroundStyle(Color(0xBBBBBB))
        if mode == .signup { field("Name", text: $name).textContentType(.name) }
        field("Email", text: $email).textContentType(.emailAddress).keyboardType(.emailAddress)
        if mode != .reset { field("Password", text: $password, secure: true).textContentType(mode == .signup ? .newPassword : .password) }
        if mode == .signup { Text("Use at least 12 characters. New accounts start as customers.").font(.system(size: 14)).foregroundStyle(Color(0xBBBBBB)) }
        primaryButton(busy ? "Please wait…" : mode == .signup ? "Create account" : mode == .reset ? "Send reset link" : "Sign in",
                      disabled: busy || email.isEmpty || (mode != .reset && password.isEmpty), action: submit)
        HStack(spacing: 20) {
            if mode != .login { link("Sign in") { mode = .login } }
            if mode != .signup { link("Create account") { mode = .signup } }
            if mode != .reset { link("Forgot password?") { mode = .reset } }
        }
        .padding(.top, 12)
    }

    private func submit() async {
        busy = true
        message = ""
        let address = email.trimmingCharacters(in: .whitespaces)
        do {
            switch mode {
            case .signup:
                guard password.count >= 12 else { throw APIError(message: "Use at least 12 characters for your password.") }
                if try await !api.signUp(email: address, password: password, name: name.trimmingCharacters(in: .whitespaces)) {
                    message = "Confirm your email, then return here to sign in."
                }
            case .reset:
                try await api.resetPassword(email: address)
                message = "If an account exists, you will receive a password reset email."
            case .login:
                try await api.signIn(email: address, password: password)
            }
            password = ""
        } catch {
            message = error.localizedDescription
        }
        busy = false
    }

    private func link(_ title: String, action: @escaping () -> Void) -> some View {
        Button(title, action: action).font(.system(size: 14)).foregroundStyle(Theme.gold).padding(.vertical, 8)
    }
}

private struct ProfileForm: View {
    let access: AccessContext
    @State private var name: String
    @State private var company: String
    @State private var message = ""
    @State private var busy = false

    init(access: AccessContext) {
        self.access = access
        _name = State(initialValue: access.displayName)
        _company = State(initialValue: access.company)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            field("Name", text: $name)
            field("Company", text: $company)
            secondaryButton("Save profile", disabled: !access.can("profile.update") || busy) { Task { await save() } }
            if !message.isEmpty { messageText(message) }
        }
    }

    private func save() async {
        busy = true
        do {
            let data = try await Supabase.shared.send(
                "rest/v1/profiles?id=eq.\(access.id)&select=id", method: "PATCH",
                body: ["display_name": String(name.trimmingCharacters(in: .whitespaces).prefix(120)), "company": String(company.trimmingCharacters(in: .whitespaces).prefix(160))],
                token: try await Supabase.shared.currentSession()?.accessToken, headers: ["Prefer": "return=representation"])
            let rows = (try? JSONSerialization.jsonObject(with: data)) as? [Any] ?? []
            message = rows.isEmpty ? "Your account cannot edit this profile." : "Profile saved."
        } catch {
            message = error.localizedDescription
        }
        busy = false
    }
}

@MainActor private func field(_ label: String, text: Binding<String>, secure: Bool = false) -> some View {
    VStack(alignment: .leading, spacing: 8) {
        Text(label).font(.system(size: 13)).foregroundStyle(Color(0xDDDDDD)).padding(.top, 12)
        Group { if secure { SecureField("", text: text) } else { TextField("", text: text) } }
            .font(.system(size: 16)).foregroundStyle(.white).textInputAutocapitalization(.never).autocorrectionDisabled()
            .padding(13).frame(minHeight: 48).background(Color(0x282828), in: .rect(cornerRadius: 5))
            .overlay(RoundedRectangle(cornerRadius: 5).stroke(Color(0x555555)))
            .accessibilityLabel(label)
    }
}

@MainActor private func primaryButton(_ title: String, disabled: Bool, action: @escaping () async -> Void) -> some View {
    Button { Task { await action() } } label: {
        Text(title).font(.system(size: 14, weight: .bold)).foregroundStyle(Theme.black).frame(maxWidth: .infinity).padding(15).background(Theme.gold, in: .rect(cornerRadius: 5))
    }
    .disabled(disabled).opacity(disabled ? 0.6 : 1).padding(.top, 12)
}

@MainActor private func secondaryButton(_ title: String, disabled: Bool = false, action: @escaping () -> Void) -> some View {
    Button(action: action) {
        Text(title).font(.system(size: 14)).foregroundStyle(Color(0xBBBBBB)).frame(maxWidth: .infinity).padding(14)
            .overlay(RoundedRectangle(cornerRadius: 5).stroke(Color(0x555555)))
    }
    .disabled(disabled).opacity(disabled ? 0.6 : 1).padding(.top, 16)
}

@MainActor private func messageText(_ text: String) -> some View {
    Text(text).font(.system(size: 14)).lineSpacing(8).foregroundStyle(Theme.notice).accessibilityAddTraits(.isStaticText)
}
