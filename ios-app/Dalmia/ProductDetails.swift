import SwiftUI

struct ProductDetails: View {
    let product: Product
    let catalog: Catalog
    let saved: Bool
    let onToggle: () -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var variantIndex = 0
    @State private var selectedSize = ""
    @State private var unavailable = false

    var body: some View {
        let variant = product.variants.indices.contains(variantIndex) ? product.variants[variantIndex] : nil
        let sizes = variant?.sizes ?? []
        let size = sizes.contains(selectedSize) ? selectedSize : sizes.first ?? ""
        let listed = variant?.prices[size] ?? nil
        VStack(spacing: 0) {
            HStack {
                iconButton("arrow.left", label: "Close product details") { dismiss() }
                Spacer()
                Text("PRODUCT DETAILS").font(.system(size: 10, weight: .bold)).tracking(2).foregroundStyle(Color(0xEEEEEE))
                Spacer()
                iconButton(saved ? "heart.fill" : "heart", label: saved ? "Unlike model \(product.model)" : "Like model \(product.model)", color: Theme.gold, action: onToggle)
            }
            .padding(.horizontal, 14).frame(height: 58)
            .overlay(alignment: .bottom) { Theme.line.frame(height: 1) }
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if !product.images.isEmpty {
                        CatalogImage(product: product).frame(maxWidth: .infinity).frame(height: 265).background(Theme.silver, in: .rect(cornerRadius: 5)).padding(.bottom, 24)
                    }
                    Text(product.category.uppercased()).font(.system(size: 9, weight: .bold)).tracking(2).foregroundStyle(Theme.gold)
                    Text(product.model).font(.system(size: 36, weight: .bold)).foregroundStyle(.white).padding(.vertical, 8)
                    if !product.specs.isEmpty { Text(product.specs.joined(separator: " · ")).font(.system(size: 13)).lineSpacing(5).foregroundStyle(Theme.muted) }
                    title("Finish and size")
                    if let variant {
                        label("FINISH / COLOR")
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(product.variants.indices, id: \.self) { i in
                                    let v = product.variants[i]
                                    Chip(title: [v.finish, v.thickness, v.weight].compactMap { $0 }.joined(separator: " · "), selected: i == variantIndex) {
                                        variantIndex = i
                                        selectedSize = ""
                                    }
                                }
                            }
                            .padding(.bottom, 17)
                        }
                        label("SIZE")
                        FlowLayout { ForEach(sizes, id: \.self) { item in Chip(title: item, selected: item == size) { selectedSize = item } } }.padding(.bottom, 20)
                        HStack {
                            VStack(alignment: .leading, spacing: 0) { label("LISTED PRICE"); Text(variant.unit).font(.system(size: 12)).foregroundStyle(Color(0xDDDDDD)) }
                            Spacer()
                            Text(listed == nil ? "Not listed" : priceAmount(listed)).font(.system(size: 25, weight: .bold)).foregroundStyle(.white)
                        }
                        .padding(18).background(Color(0x262626), in: .rect(cornerRadius: 5))
                        title("Calculated prices")
                        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible())], spacing: 10) {
                            ForEach(Array(zip(priceFields.indices, calculatedPrices(listed))), id: \.0) { i, value in
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(priceFields[i].label).font(.system(size: 10)).foregroundStyle(Color(0xBBBBBB))
                                    Text(priceAmount(value)).font(.system(size: 19, weight: .semibold).monospacedDigit()).foregroundStyle(Theme.gold)
                                }
                                .padding(15).frame(maxWidth: .infinity, alignment: .leading)
                                .background(Theme.charcoal, in: .rect(cornerRadius: 4)).overlay(RoundedRectangle(cornerRadius: 4).stroke(Color(0x383838)))
                            }
                        }
                        note("The discount applies first. Then 18% or 9% is added to the discounted amount. Results use two decimal places.")
                        if variant.unit == "Per inch" { warning("All amounts are per inch, not the total price of a handle.") }
                        if listed == nil { warning("The source does not list a price for this size.") }
                        if let box = variant.box, box > 0 { note("Box quantity: \(box.formatted()) \(variant.boxUnit ?? "pcs")") }
                    } else {
                        warning("No price is listed for this model in the supplied documents.")
                    }
                    ForEach(product.notes, id: \.self, content: warning)
                    title("Original documents")
                    note("PDF links need an internet connection.")
                    ForEach(product.sources, id: \.self) { source in
                        let document = catalog.documents.first { $0.id == source.document }
                        Button { open(document, page: source.page) } label: {
                            HStack(spacing: 15) {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(document?.file ?? "").font(.system(size: 12)).foregroundStyle(Color(0xEEEEEE))
                                    Text("Page \(source.page)").font(.system(size: 10)).foregroundStyle(Theme.muted)
                                }
                                Spacer()
                                Image(systemName: "arrow.up.right.square").font(.system(size: 16)).foregroundStyle(Theme.gold)
                            }
                            .padding(.vertical, 15)
                            .overlay(alignment: .bottom) { Color(0x333333).frame(height: 1) }
                        }
                        .accessibilityAddTraits(.isLink)
                    }
                    note(catalog.priceNote).padding(.top, 10)
                }
                .padding(22).padding(.bottom, 18)
            }
        }
        .background(Theme.black)
        .alert("Document unavailable", isPresented: $unavailable) {} message: { Text("Connect to the internet and try again.") }
    }

    private func open(_ document: SourceDocument?, page: Int) {
        guard let document, let url = catalogDocumentURL(document, page: page, supabaseURL: Config.supabaseURL) else { return }
        openURL(url) { accepted in if !accepted { unavailable = true } }
    }

    private func iconButton(_ symbol: String, label: String, color: Color = .white, action: @escaping () -> Void) -> some View {
        Button(action: action) { Image(systemName: symbol).font(.system(size: 20)).foregroundStyle(color).frame(width: 44, height: 44) }.accessibilityLabel(label)
    }

    private func title(_ text: String) -> some View {
        Text(text).font(.system(size: 17, weight: .semibold)).foregroundStyle(.white).padding(.top, 26).padding(.bottom, 14)
    }

    private func label(_ text: String) -> some View {
        Text(text).font(.system(size: 8, weight: .semibold)).tracking(1.5).foregroundStyle(Theme.muted).padding(.bottom, 8)
    }

    private func note(_ text: String) -> some View {
        Text(text).font(.system(size: 11)).lineSpacing(5).foregroundStyle(Color(0xA2A2A2)).padding(.top, 12)
    }

    private func warning(_ text: String) -> some View {
        Text(text).font(.system(size: 12)).lineSpacing(5).foregroundStyle(Color(0xE1C995))
            .padding(14).frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(0x30291D)).overlay(alignment: .leading) { Theme.gold.frame(width: 2) }
            .padding(.top, 14)
    }
}
