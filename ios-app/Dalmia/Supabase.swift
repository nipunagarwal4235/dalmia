import Foundation
import Observation
import Security

enum Config {
    static let supabaseURL = (Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String ?? "").replacing(/\/+$/, with: "")
    static let publishableKey = Bundle.main.object(forInfoDictionaryKey: "SupabasePublishableKey") as? String ?? ""
    static let siteURL = "https://dalmia-blush.vercel.app"
}

struct Session: Codable, Equatable {
    var accessToken: String
    var refreshToken: String
    var expiresAt: Double
    var userID: String
    var email: String?
}

struct APIError: LocalizedError {
    let message: String
    var code: String?
    var status = 0
    var errorDescription: String? { message }
}

// Talks to Supabase Auth and PostgREST over HTTP. The session lives in the Keychain.
@MainActor @Observable final class Supabase {
    static let shared = Supabase()
    private(set) var session = Keychain.load()
    @ObservationIgnored private var refreshing: Task<Session?, Error>?

    func send(_ path: String, method: String = "POST", body: Any? = nil, token: String? = nil, headers: [String: String] = [:]) async throws -> Data {
        guard !Config.supabaseURL.isEmpty, !Config.publishableKey.isEmpty, let url = URL(string: "\(Config.supabaseURL)/\(path)") else {
            throw APIError(message: "Set the Supabase URL and publishable key.")
        }
        var request = URLRequest(url: url, timeoutInterval: 10)
        request.httpMethod = method
        request.setValue(Config.publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        for (name, value) in headers { request.setValue(value, forHTTPHeaderField: name) }
        if let body { request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let message = (json?["msg"] ?? json?["message"] ?? json?["error_description"]) as? String
            throw APIError(message: message ?? "Request failed (\(status)).", code: (json?["code"] ?? json?["error_code"]).map { "\($0)" }, status: status)
        }
        return data
    }

    func rpc(_ name: String, _ body: [String: Any] = [:]) async throws -> Data {
        try await send("rest/v1/rpc/\(name)", body: body, token: try await currentSession()?.accessToken)
    }

    // Returns a usable session, refreshing tokens that expire within a minute.
    func currentSession() async throws -> Session? {
        guard let session else { return nil }
        if session.expiresAt - 60 > Date().timeIntervalSince1970 { return session }
        if let refreshing { return try await refreshing.value }
        let task = Task { () throws -> Session? in
            defer { refreshing = nil }
            do { return try await token("refresh_token", ["refresh_token": session.refreshToken]) }
            catch let error as APIError where (400...401).contains(error.status) { store(nil); return nil }
        }
        refreshing = task
        return try await task.value
    }

    func signIn(email: String, password: String) async throws {
        _ = try await token("password", ["email": email, "password": password])
    }

    // Returns false when the new account must confirm its email first.
    func signUp(email: String, password: String, name: String) async throws -> Bool {
        let data = try await send("auth/v1/signup?redirect_to=\(redirect)", body: ["email": email, "password": password, "data": ["display_name": name]])
        guard let next = Self.session(from: data) else { return false }
        store(next)
        return true
    }

    func resetPassword(email: String) async throws {
        _ = try await send("auth/v1/recover?redirect_to=\(redirect)", body: ["email": email])
    }

    func signOut() async {
        if let token = session?.accessToken { _ = try? await send("auth/v1/logout", token: token) }
        store(nil)
    }

    // Removes the account, profile, roles, and saved products on the server.
    func deleteAccount() async throws {
        _ = try await rpc("delete_own_account")
        store(nil)
    }

    private var redirect: String { "\(Config.siteURL)/auth/mobile".addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? "" }

    private func token(_ grant: String, _ body: [String: Any]) async throws -> Session {
        guard let next = Self.session(from: try await send("auth/v1/token?grant_type=\(grant)", body: body)) else {
            throw APIError(message: "Sign-in is unavailable. Try again.")
        }
        store(next)
        return next
    }

    private func store(_ next: Session?) {
        session = next
        Keychain.save(next)
    }

    private static func session(from data: Data) -> Session? {
        guard let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let access = json["access_token"] as? String, let refresh = json["refresh_token"] as? String,
              let user = json["user"] as? [String: Any], let id = user["id"] as? String else { return nil }
        let expiresAt = json["expires_at"] as? Double ?? Date().timeIntervalSince1970 + (json["expires_in"] as? Double ?? 3600)
        return Session(accessToken: access, refreshToken: refresh, expiresAt: expiresAt, userID: id, email: user["email"] as? String)
    }
}

private enum Keychain {
    static var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.dalmiahardware.catalog", kSecAttrAccount as String: "supabase-session"]
    }

    static func load() -> Session? {
        var request = query
        request[kSecReturnData as String] = true
        var result: AnyObject?
        guard SecItemCopyMatching(request as CFDictionary, &result) == errSecSuccess, let data = result as? Data else { return nil }
        return try? JSONDecoder().decode(Session.self, from: data)
    }

    static func save(_ session: Session?) {
        SecItemDelete(query as CFDictionary)
        guard let session, let data = try? JSONEncoder().encode(session) else { return }
        var item = query
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(item as CFDictionary, nil)
    }
}
