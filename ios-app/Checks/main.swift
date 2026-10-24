// Run: swiftc -enable-bare-slash-regex Dalmia/Catalog.swift Checks/main.swift -o build/checks && build/checks
import Foundation

let catalog = Catalog.decode(try! Data(contentsOf: URL(fileURLWithPath: "Dalmia/catalog.json")))!
let products = catalog.products
assert(products.count == 149 && catalog.documents.count == 5)
assert(products.filter { !$0.images.isEmpty }.count == 148)
assert(products.reduce(0) { $0 + $1.variants.reduce(0) { $0 + $1.prices.values.compactMap { $0 }.count } } == 938)

assert(swipeAction(dx: 130, dy: 12) == .save && swipeAction(dx: -130, dy: 12) == .next)
assert(swipeAction(dx: 10, dy: 160) == nil && swipeAction(dx: 60, dy: 90) == nil && swipeAction(dx: 25, dy: 3) == nil)
assert(swipeAction(dx: 50, dy: 4, velocityX: 1100) == .save && swipeAction(dx: -50, dy: 4, velocityX: -1100) == .next)
assert(swipeAction(dx: 4, dy: 2, velocityX: 2000) == nil)
assert(nextIndex(0, 149) == 1 && nextIndex(148, 149) == 0 && nextIndex(0, 1) == 0 && nextIndex(0, 0) == 0)

assert(findProducts(products, query: "DH1501", category: "", saved: nil)[0].model == "DH-1501")
assert(findProducts(products, query: "DH 1501", category: "", saved: nil)[0].model == "DH-1501")
assert(findProducts(products, query: "2605", category: "", saved: nil).map(\.model) == ["2605"])
assert(findProducts(products, query: "", category: "Door handles", saved: nil).count == 46)
let match = products.first { $0.model == "2601" }!
assert(findProducts(products, query: "2601", category: "Door handles", saved: [match.id]).count == 1)
assert(findProducts(products, query: "", category: "", saved: []).isEmpty)

assert(calculatedPrices(1000) == [350, 250, 413, 295, 381.5, 272.5])
assert(calculatedPrices(30) == [10.5, 7.5, 12.39, 8.85, 11.45, 8.18])
assert(calculatedPrices(nil).allSatisfy { $0 == nil })
assert(priceAmount(123456.5) == "1,23,456.50" && priceAmount(nil) == "—")
assert(products.first { $0.model == "1711" }!.variants[0].sizes == ["8 in", "12 in", "16 in", "18 in", "24 in"])
assert(catalogMediaURL("products/a b.png", supabaseURL: "https://x.supabase.co/")?.absoluteString == "https://x.supabase.co/storage/v1/object/public/catalog-media/products/a%20b.png")
assert(catalogMediaURL("https://evil.example/a.png", supabaseURL: "https://x.supabase.co") == nil)
print("iOS catalog checks passed")
