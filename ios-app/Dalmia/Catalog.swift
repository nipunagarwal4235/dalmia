import Foundation

// Matches the JSON returned by the get_catalog RPC and bundled in catalog.json.
struct Source: Codable, Hashable { let document: String; let page: Int }
struct ProductImage: Codable, Hashable { let src: String }
struct Variant: Codable, Hashable {
    let finish: String
    let thickness: String?
    let prices: [String: Double?]
    let unit: String
    let box: Double?
    let boxUnit: String?
    let weight: String?
    // ponytail: JSON key order is lost when decoding, so sizes use natural order. That matches every current price list.
    var sizes: [String] { prices.keys.sorted { $0.localizedStandardCompare($1) == .orderedAscending } }
}
struct Product: Codable, Identifiable, Hashable {
    let id: String
    let model: String
    let category: String
    let variants: [Variant]
    let sources: [Source]
    let images: [ProductImage]
    let model3d: String?
    let notes: [String]
    let specs: [String]
    let sizes: [String]
    let minPrice: Double?
    let searchText: String
    var perInch: Bool { variants.contains { $0.unit == "Per inch" } }
}
struct SourceDocument: Codable, Hashable { let id: String; let file: String }
struct Catalog: Codable {
    let products: [Product]
    let documents: [SourceDocument]
    let priceNote: String

    static func decode(_ data: Data) -> Catalog? {
        guard let catalog = try? JSONDecoder().decode(Catalog.self, from: data),
              Set(catalog.products.map(\.id)).count == catalog.products.count else { return nil }
        return catalog
    }
}

let categoryOrder = ["Door handles", "Knobs", "Sofa legs", "Profile handles", "Concealed handles", "Brackets"]

func discoveryOrder(_ products: [Product]) -> [Product] {
    products.sorted {
        let a = categoryOrder.firstIndex(of: $0.category) ?? -1, b = categoryOrder.firstIndex(of: $1.category) ?? -1
        return a != b ? a < b : $0.model.localizedStandardCompare($1.model) == .orderedAscending
    }
}

func normalize(_ value: String) -> String { value.lowercased().filter { ("a"..."z").contains($0) || ("0"..."9").contains($0) } }

func findProducts(_ products: [Product], query: String, category: String, saved: Set<String>?) -> [Product] {
    let tokens = query.split(whereSeparator: \.isWhitespace).map { normalize(String($0)) }.filter { !$0.isEmpty }
    return products.filter { product in
        (category.isEmpty || product.category == category) && (saved?.contains(product.id) ?? true) && tokens.allSatisfy { token in
            token.wholeMatch(of: /(dh)?\d{3,4}/) != nil ? normalize(product.model).contains(token) : normalize(product.searchText).contains(token)
        }
    }
}

enum SwipeAction { case save, next }

// Distances are points and velocity is points per second.
func swipeAction(dx: Double, dy: Double, velocityX: Double = 0) -> SwipeAction? {
    if abs(dx) < abs(dy) * 1.3 { return nil }
    if abs(dx) < 84 && !(abs(dx) > 40 && abs(velocityX) > 700) { return nil }
    return dx > 0 ? .save : .next
}

func nextIndex(_ index: Int, _ count: Int) -> Int { count > 0 ? (index + 1) % count : 0 }

let priceFields: [(label: String, factor: Double)] = [
    ("65% off", 3500), ("75% off", 2500), ("65% off + 18%", 4130),
    ("75% off + 18%", 2950), ("65% off + 9%", 3815), ("75% off + 9%", 2725),
]

func calculatedPrices(_ listed: Double?) -> [Double?] {
    priceFields.map { field in listed.map { ($0 * field.factor / 100 + .ulpOfOne + 0.5).rounded(.down) / 100 } }
}

private let rupees: NumberFormatter = {
    let formatter = NumberFormatter()
    formatter.locale = Locale(identifier: "en_IN")
    formatter.numberStyle = .decimal
    formatter.minimumFractionDigits = 2
    formatter.maximumFractionDigits = 2
    return formatter
}()

func priceAmount(_ value: Double?) -> String { value.flatMap { rupees.string(from: NSNumber(value: $0)) } ?? "—" }

// Same characters JavaScript's encodeURIComponent leaves alone.
private let uriComponent = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()")

// Catalog records keep object paths in the public catalog-media bucket.
func catalogMediaURL(_ path: String, supabaseURL: String) -> URL? {
    guard !supabaseURL.isEmpty else { return nil }
    let origin = supabaseURL.replacing(/\/+$/, with: "") + "/storage/v1/object/public/catalog-media/"
    if path.hasPrefix("http://") || path.hasPrefix("https://") { return path.hasPrefix(origin) ? URL(string: path) : nil }
    let object = path.replacing(/^\/+/, with: "").split(separator: "/", omittingEmptySubsequences: false)
        .map { String($0).addingPercentEncoding(withAllowedCharacters: uriComponent) ?? "" }
        .joined(separator: "/")
    return URL(string: origin + object)
}

func catalogDocumentURL(_ document: SourceDocument, page: Int, supabaseURL: String) -> URL? {
    guard let url = catalogMediaURL("documents/\(document.file)", supabaseURL: supabaseURL) else { return nil }
    return page > 0 ? URL(string: url.absoluteString + "#page=\(page)") : url
}
