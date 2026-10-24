import SwiftUI

enum Tab { case discover, saved, account }

struct RootView: View {
    @State private var store = CatalogStore()
    @State private var saves = SavedStore()
    private var api = Supabase.shared
    @State private var tab = Tab.discover
    @State private var query = ""
    @State private var category = ""
    @State private var searchOpen = false
    @State private var position: String?
    @State private var index = 0
    @State private var detail: Product?
    @State private var toast = ""

    private var products: [Product] { store.catalog.products }
    private var categories: [String] { products.reduce(into: []) { if !$0.contains($1.category) { $0.append($1.category) } } }
    private var visible: [Product] { findProducts(discoveryOrder(products), query: query, category: category, saved: tab == .saved ? saves.saved : nil) }

    var body: some View {
        let visible = visible
        VStack(spacing: 0) {
            header
            if searchOpen { searchPanel }
            if tab == .account {
                AccountView()
            } else {
                feedHeading(count: visible.count)
                if !query.isEmpty || !category.isEmpty {
                    HStack(spacing: 12) {
                        Text([query, category].filter { !$0.isEmpty }.joined(separator: " · ")).font(.system(size: 10)).foregroundStyle(Theme.gold).lineLimit(1)
                        Spacer()
                        Button("Clear filters", action: reset).font(.system(size: 10)).underline().foregroundStyle(Color(0xBBBBBB)).accessibilityLabel("Reset all filters")
                    }
                    .frame(height: 30).padding(.horizontal, 20)
                }
                if tab == .saved && saves.signedIn {
                    Button("Add device saves to account", action: saves.importGuest).font(.system(size: 10)).underline().foregroundStyle(Color(0xBBBBBB))
                }
                if !saves.error.isEmpty {
                    Text(saves.error).font(.system(size: 10)).lineSpacing(3).foregroundStyle(Theme.notice).padding(10).frame(maxWidth: .infinity, alignment: .leading).background(Color(0x362B19))
                }
                feed(visible).overlay(alignment: .top) { toastView }
            }
            tabs
        }
        .background(Theme.black)
        .fullScreenCover(item: $detail) { product in
            ProductDetails(product: product, catalog: store.catalog, saved: saves.saved.contains(product.id), onToggle: { toggle(product) })
        }
        .onChange(of: api.session?.userID, initial: true) { saves.changeUser($1) }
        .onChange(of: [query, category, "\(tab)"]) { position = nil; index = 0 }
        .onChange(of: position) { if let id = $1, let next = visible.firstIndex(where: { $0.id == id }) { index = next } }
        .onChange(of: visible.count) { if index >= $1 { index = max(0, $1 - 1); position = visible.indices.contains(index) ? visible[index].id : nil } }
        .task(id: toast) {
            guard !toast.isEmpty else { return }
            try? await Task.sleep(for: .seconds(1.9))
            toast = ""
        }
    }

    private var header: some View {
        HStack {
            Brand()
            Spacer()
            HStack(spacing: 4) {
                headerButton("magnifyingglass", active: searchOpen, label: "Search models and filter categories")
                headerButton("line.3.horizontal.decrease", active: !category.isEmpty, label: "Filter products")
            }
        }
        .padding(.horizontal, 20).frame(height: 64).background(Theme.panel)
        .overlay(alignment: .bottom) { Color(0x303030).frame(height: 1) }
    }

    private func headerButton(_ symbol: String, active: Bool, label: String) -> some View {
        Button { searchOpen.toggle() } label: {
            Image(systemName: symbol).font(.system(size: 19)).foregroundStyle(active ? Theme.gold : Color(0xEEEEEE))
                .frame(width: 40, height: 40).background(searchOpen && symbol == "magnifyingglass" ? Color(0x2D2D2D) : .clear, in: .rect(cornerRadius: 4))
        }
        .accessibilityLabel(label)
    }

    private var searchPanel: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").font(.system(size: 15)).foregroundStyle(Color(0x999999))
                TextField("", text: $query, prompt: Text("Model number, finish, or keyword").foregroundStyle(Color(0x8E8E8E)))
                    .font(.system(size: 12)).foregroundStyle(.white).autocorrectionDisabled().textInputAutocapitalization(.never)
                    .submitLabel(.search).onSubmit { searchOpen = false }
                    .accessibilityLabel("Search model number or finish")
                if !query.isEmpty {
                    Button { query = "" } label: { Image(systemName: "xmark").font(.system(size: 15)).foregroundStyle(.white).padding(8) }.accessibilityLabel("Clear search")
                }
            }
            .padding(.horizontal, 12).frame(height: 42).background(Color(0x2B2B2B), in: .rect(cornerRadius: 4))
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color(0x404040)))
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach([""] + categories, id: \.self) { value in
                        Button { category = value } label: {
                            Text(value.isEmpty ? "All products" : value).font(.system(size: 10, weight: category == value ? .semibold : .regular))
                                .foregroundStyle(category == value ? Theme.black : Color(0xCCCCCC))
                                .padding(.horizontal, 12).padding(.vertical, 8).background(category == value ? Theme.gold : Color(0x2E2E2E), in: .rect(cornerRadius: 3))
                        }
                        .accessibilityAddTraits(category == value ? .isSelected : [])
                    }
                }
                .padding(.vertical, 12)
            }
        }
        .padding(.horizontal, 16).padding(.top, 10).background(Theme.panel)
    }

    private func feedHeading(count: Int) -> some View {
        HStack {
            HStack(spacing: 8) {
                Theme.gold.frame(width: 16, height: 1)
                Text(tab == .saved ? "YOUR SAVED COLLECTION" : "THE DALMIA COLLECTION").font(.system(size: 8, weight: .semibold)).tracking(1.9).foregroundStyle(Color(0xBBBBBB))
            }
            Spacer()
            Text("\(count) \(count == 1 ? "product" : "products")").font(.system(size: 10)).foregroundStyle(Color(0x8F8F8F))
        }
        .padding(.horizontal, 20).frame(height: 42)
    }

    @ViewBuilder private func feed(_ visible: [Product]) -> some View {
        if !saves.ready {
            emptyState { ProgressView().tint(Theme.gold); Text("Opening your collection…").font(.system(size: 13)).foregroundStyle(Color(0xAAAAAA)) }
        } else if visible.isEmpty {
            let welcome = tab == .saved && saves.saved.isEmpty
            emptyState {
                Image(systemName: tab == .saved ? "heart" : "magnifyingglass").font(.system(size: 44)).foregroundStyle(Theme.gold)
                Text(welcome ? "Keep what you love." : "No matching products").font(.system(size: 26, weight: .semibold)).foregroundStyle(.white)
                Text(welcome ? "Swipe right on a product to save it here. Sign in to sync your collection across devices." : "Try a different model number or clear the filters.")
                    .font(.system(size: 13)).lineSpacing(6).foregroundStyle(Color(0xAAAAAA))
                Button { reset(); tab = .discover } label: {
                    HStack(spacing: 12) { Text("Explore all products").font(.system(size: 12, weight: .bold)); Image(systemName: "arrow.right") }
                        .foregroundStyle(Theme.black).padding(.vertical, 13).padding(.horizontal, 20).background(Theme.gold, in: .rect(cornerRadius: 4))
                }
                .padding(.top, 8)
            }
        } else {
            GeometryReader { geometry in
                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(spacing: 0) {
                        ForEach(Array(visible.enumerated()), id: \.element.id) { itemIndex, product in
                            ProductCard(
                                product: product, size: geometry.size, index: itemIndex, count: visible.count,
                                saved: saves.saved.contains(product.id), active: index == itemIndex, savedView: tab == .saved,
                                onSave: { save(product) }, onToggle: { toggle(product) },
                                onNext: { advance(from: itemIndex, in: visible) }, onDetails: { detail = product }
                            )
                            .frame(width: geometry.size.width, height: geometry.size.height)
                        }
                    }
                    .scrollTargetLayout()
                }
                .scrollTargetBehavior(.paging)
                .scrollPosition(id: $position)
                .id("\(tab)-\(query)-\(category)")
                .accessibilityLabel("Product discovery feed")
            }
        }
    }

    private func emptyState(@ViewBuilder _ content: () -> some View) -> some View {
        VStack(spacing: 16, content: content).multilineTextAlignment(.center).padding(.horizontal, 38).frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder private var toastView: some View {
        if !toast.isEmpty {
            HStack(spacing: 8) {
                Image(systemName: "checkmark").font(.system(size: 13, weight: .semibold)).foregroundStyle(Theme.gold)
                Text(toast).font(.system(size: 11)).foregroundStyle(Color(0xF0F0F0))
            }
            .padding(.vertical, 12).padding(.horizontal, 10).frame(maxWidth: .infinity)
            .background(Color(0x101010, opacity: 0.93), in: .rect(cornerRadius: 5))
            .overlay(RoundedRectangle(cornerRadius: 5).stroke(Color(0x6D5B37)))
            .padding(.horizontal, 28).padding(.top, 43)
            .allowsHitTesting(false)
            .accessibilityAddTraits(.updatesFrequently)
        }
    }

    private var tabs: some View {
        HStack(spacing: 0) {
            tabButton(.discover, "Discover", symbol: "square.grid.2x2", label: "Discover products")
            Color(0x333333).frame(width: 1, height: 20).padding(.horizontal, 20)
            tabButton(.saved, "Saved", symbol: tab == .saved ? "heart.fill" : "heart", label: "Saved products, \(saves.saved.count) liked") {
                Text("\(saves.saved.count)").font(.system(size: 9, weight: .bold)).foregroundStyle(Theme.gold)
                    .padding(.horizontal, 5).frame(minWidth: 20, minHeight: 19).background(Color(0x313131), in: .rect(cornerRadius: 4))
            }
            tabButton(.account, "Account", symbol: nil, label: "Account")
        }
        .padding(.horizontal, 35).frame(height: 58).background(Theme.panel)
        .overlay(alignment: .top) { Color(0x343434).frame(height: 1) }
    }

    private func tabButton(_ value: Tab, _ title: String, symbol: String?, label: String, @ViewBuilder badge: () -> some View = { EmptyView() }) -> some View {
        let selected = tab == value
        return Button {
            tab = value
            searchOpen = false
            if value == .saved { reset() }
        } label: {
            HStack(spacing: 8) {
                if let symbol { Image(systemName: symbol).font(.system(size: 18)).foregroundStyle(selected ? Theme.gold : Color(0x909090)) }
                Text(title).font(.system(size: 11, weight: selected ? .semibold : .regular)).foregroundStyle(selected ? .white : Color(0x999999))
                badge()
            }
            .frame(maxWidth: .infinity).frame(height: 49)
            .overlay(alignment: .top) { if selected { Theme.gold.frame(height: 2) } }
        }
        .accessibilityLabel(label)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func reset() {
        query = ""
        category = ""
    }

    private func save(_ product: Product) {
        saves.set(product.id, true)
        toast = "\(product.model) saved to your collection"
    }

    private func toggle(_ product: Product) {
        let wasSaved = saves.saved.contains(product.id)
        saves.set(product.id, !wasSaved)
        toast = wasSaved ? "\(product.model) removed from saved" : "\(product.model) saved to your collection"
    }

    private func advance(from itemIndex: Int, in visible: [Product]) {
        let next = nextIndex(itemIndex, visible.count)
        guard visible.indices.contains(next) else { return }
        index = next
        position = visible[next].id
        if next == 0 && visible.count > 1 { toast = "Back to the first product" }
    }
}
