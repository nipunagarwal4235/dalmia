import Foundation
import Observation

// Starts from the bundled catalog, then the last download, then refreshes every minute.
@MainActor @Observable final class CatalogStore {
    private(set) var catalog: Catalog
    @ObservationIgnored private let cacheURL = URL.cachesDirectory.appending(path: "dalmia-catalog-v1.json")

    init() {
        let bundled = Bundle.main.url(forResource: "catalog", withExtension: "json").flatMap { try? Data(contentsOf: $0) }.flatMap(Catalog.decode)
        catalog = (try? Data(contentsOf: cacheURL)).flatMap(Catalog.decode) ?? bundled ?? Catalog(products: [], documents: [], priceNote: "")
        Task {
            while true {
                await refresh()
                try? await Task.sleep(for: .seconds(60))
            }
        }
    }

    private func refresh() async {
        // Keep the last usable catalog when the device is offline.
        guard let data = try? await Supabase.shared.send("rest/v1/rpc/get_catalog", body: ["include_pages": false]),
              let fresh = Catalog.decode(data) else { return }
        catalog = fresh
        try? data.write(to: cacheURL)
    }
}

private struct AccountSaves: Codable { var ids: [String]; var pending: [String: Bool] }

// Guests keep saves on the device. Accounts keep a local copy plus a queue of changes to send.
@MainActor @Observable final class SavedStore {
    private(set) var saved: Set<String> = []
    private(set) var ready = false
    private(set) var error = ""
    private(set) var signedIn = false
    @ObservationIgnored private var user: String?
    @ObservationIgnored private var pending: [String: Bool] = [:]
    @ObservationIgnored private var generation = 0
    @ObservationIgnored private var running = false
    @ObservationIgnored private let defaults = UserDefaults.standard
    private let guestKey = "dalmia-mobile-likes-v1"
    private var key: String { user.map { "dalmia-saved-account-\($0)" } ?? guestKey }

    init() {
        Task {
            while true {
                try? await Task.sleep(for: .seconds(15))
                await sync()
            }
        }
    }

    func changeUser(_ next: String?) {
        if ready && user == next { return }
        generation += 1
        user = next
        running = false
        signedIn = next != nil
        error = ""
        if next != nil {
            let stored = defaults.data(forKey: key).flatMap { try? JSONDecoder().decode(AccountSaves.self, from: $0) }
            saved = Set(stored?.ids ?? [])
            pending = stored?.pending ?? [:]
        } else {
            saved = Set(defaults.stringArray(forKey: key) ?? [])
            pending = [:]
        }
        ready = true
        Task { await sync() }
    }

    func set(_ id: String, _ selected: Bool) {
        guard ready else { return }
        if selected { saved.insert(id) } else { saved.remove(id) }
        if user != nil { pending[id] = selected }
        persist()
        Task { await sync() }
    }

    func importGuest() {
        guard user != nil, ready else { return }
        for id in defaults.stringArray(forKey: guestKey) ?? [] { set(id, true) }
    }

    private func persist() {
        if user != nil { defaults.set(try? JSONEncoder().encode(AccountSaves(ids: Array(saved), pending: pending)), forKey: key) }
        else { defaults.set(Array(saved), forKey: key) }
    }

    private func sync() async {
        guard let owner = user, ready, !running else { return }
        let token = generation
        running = true
        defer { if token == generation { running = false } }
        let api = Supabase.shared
        do {
            guard try await api.currentSession()?.userID == owner, token == generation else { return }
            for (id, value) in pending {
                do { _ = try await api.rpc("set_saved_product", ["product": id, "saved": value]) }
                catch let error as APIError where error.code == "23503" {} // The product no longer exists.
                guard token == generation else { return }
                if pending[id] == value { pending[id] = nil }
                persist()
            }
            let ids = try JSONDecoder().decode([String]?.self, from: try await api.rpc("get_saved_products")) ?? []
            guard token == generation else { return }
            var next = Set(ids)
            for (id, selected) in pending { if selected { next.insert(id) } else { next.remove(id) } }
            saved = next
            error = ""
            persist()
        } catch {
            if token == generation { self.error = "Saved changes are on this device. Sync will retry when your connection and account access are available." }
        }
    }
}

struct AccessContext: Decodable {
    let id: String
    let displayName: String
    let company: String
    let active: Bool
    let roles: [String]
    let permissions: [String]
    func can(_ permission: String) -> Bool { active && permissions.contains(permission) }
}

func roleLabel(_ role: String) -> String { role.split(separator: "_").map { $0.prefix(1).uppercased() + $0.dropFirst() }.joined(separator: " ") }
