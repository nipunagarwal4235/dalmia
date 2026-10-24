import SwiftUI

struct ProductCard: View {
    let product: Product
    let size: CGSize
    let index: Int
    let count: Int
    let saved: Bool
    let active: Bool
    let savedView: Bool
    let onSave: () -> Void
    let onToggle: () -> Void
    let onNext: () -> Void
    let onDetails: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var offset: CGFloat = 0
    @State private var busy = false

    private var short: Bool { size.height < 620 }
    private var tiny: Bool { size.height < 520 }

    var body: some View {
        VStack(spacing: 0) {
            topline
            picture
            info
        }
        .background(Theme.charcoal)
        .clipShape(.rect(cornerRadius: 6))
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(0x373737)))
        .offset(x: offset)
        .rotationEffect(.degrees(min(8, max(-8, offset / 300 * 8))))
        .simultaneousGesture(swipe)
        .padding(.horizontal, 14).padding(.bottom, 10)
        .clipped()
        .onChange(of: active) { if !$1 { offset = 0; busy = false } }
    }

    private var swipe: some Gesture {
        DragGesture(minimumDistance: 14)
            .onChanged { value in
                guard !busy, offset != 0 || abs(value.translation.width) > abs(value.translation.height) * 1.6 else { return }
                offset = value.translation.width
            }
            .onEnded { value in
                guard !busy, offset != 0 else { return }
                if let action = swipeAction(dx: value.translation.width, dy: value.translation.height, velocityX: value.velocity.width) { perform(action) }
                else { withAnimation(.spring(duration: 0.3)) { offset = 0 } }
            }
    }

    private func perform(_ action: SwipeAction) {
        guard !busy else { return }
        busy = true
        UIImpactFeedbackGenerator(style: action == .save ? .medium : .light).impactOccurred()
        withAnimation(.easeOut(duration: reduceMotion ? 0 : 0.19)) {
            offset = (action == .save ? 1 : -1) * max(size.width, 450)
        } completion: {
            if action == .save { onSave() }
            onNext()
            offset = 0
            busy = false
        }
    }

    private var topline: some View {
        HStack {
            Text(product.category.uppercased()).font(.system(size: 9, weight: .bold)).tracking(1.7).foregroundStyle(Theme.gold)
            Spacer()
            (Text(String(format: "%02d ", index + 1)).foregroundStyle(.white) + Text("/ \(count)").foregroundStyle(Color(0x8B8B8B)))
                .font(.system(size: 11, weight: .semibold).monospacedDigit())
        }
        .padding(.horizontal, 15).frame(height: 36).background(Theme.ink)
    }

    private var picture: some View {
        ZStack {
            Theme.silver
            CatalogImage(product: product)
            Text("DALMIA / ORIGINAL CATALOGUE").font(.system(size: 7, weight: .semibold)).tracking(1.2).foregroundStyle(Color(0x555555))
                .padding(.horizontal, 7).padding(.vertical, 4).background(Color.white.opacity(0.8), in: .rect(cornerRadius: 2))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading).padding([.leading, .bottom], 10)
            Button(action: onDetails) {
                Image(systemName: "info.circle").font(.system(size: 20)).foregroundStyle(Theme.ink)
                    .frame(width: 38, height: 38).background(Color.white.opacity(0.92), in: .circle)
            }
            .accessibilityLabel("View details for \(product.model)")
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing).padding(10)
            if saved {
                HStack(spacing: 5) {
                    Image(systemName: "heart.fill").font(.system(size: 10))
                    Text("SAVED").font(.system(size: 8, weight: .heavy)).tracking(1)
                }
                .foregroundStyle(Theme.black).padding(.horizontal, 9).padding(.vertical, 6).background(Theme.gold, in: .rect(cornerRadius: 3))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing).padding(12)
            }
            stamp("SAVED", symbol: "heart.fill", color: Theme.gold, angle: -12, opacity: ramp(offset, 35, 100), alignment: .topLeading)
            stamp("NEXT", symbol: "arrow.right", color: .white, angle: 12, opacity: ramp(-offset, 35, 100), alignment: .topTrailing)
        }
        .frame(minHeight: tiny ? 100 : 150)
        .clipped()
    }

    private func stamp(_ title: String, symbol: String, color: Color, angle: Double, opacity: Double, alignment: Alignment) -> some View {
        HStack(spacing: 10) {
            if title == "SAVED" { Image(systemName: symbol).font(.system(size: 24)) }
            Text(title).font(.system(size: 30, weight: .black))
            if title == "NEXT" { Image(systemName: symbol).font(.system(size: 24, weight: .semibold)) }
        }
        .foregroundStyle(color).padding(.horizontal, 16).padding(.vertical, 10)
        .background(Color(0x151515, opacity: 0.91), in: .rect(cornerRadius: 6))
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(color, lineWidth: 3))
        .rotationEffect(.degrees(angle)).opacity(opacity)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: alignment).padding(.horizontal, 25).padding(.top, 35)
        .allowsHitTesting(false)
    }

    private var info: some View {
        let prices = calculatedPrices(product.minPrice)
        let perInch = product.perInch ? " / INCH" : ""
        return VStack(spacing: 0) {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("MODEL").font(.system(size: 8, weight: .semibold)).tracking(2).foregroundStyle(Color(0x929292))
                    Text(product.model).font(.custom("Georgia", size: product.model.count > 16 ? 21 : short ? 32 : 38)).tracking(-0.5)
                        .foregroundStyle(.white).lineLimit(product.model.count > 20 ? 2 : 1).minimumScaleFactor(0.7)
                }
                Spacer(minLength: 0)
                VStack(alignment: .trailing, spacing: 0) {
                    Text(product.minPrice == nil ? "Listed price" : "Starting at").font(.system(size: 9)).foregroundStyle(Theme.muted).padding(.bottom, 5)
                    Text(product.minPrice == nil ? "Not listed" : priceAmount(product.minPrice)).font(.system(size: 18, weight: .semibold).monospacedDigit()).foregroundStyle(.white)
                    if product.perInch { Text("per inch").font(.system(size: 9)).foregroundStyle(Theme.gold).padding(.top, 3) }
                }
            }
            Text((product.sizes.isEmpty ? "See catalogue details" : product.sizes.joined(separator: " · "))
                 + (product.variants.isEmpty ? "" : "  /  \(product.variants.count) price \(product.variants.count == 1 ? "row" : "rows")"))
                .font(.system(size: 10)).foregroundStyle(Color(0xB7B7B7)).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 7).padding(.bottom, 12)
            if !tiny {
                HStack(spacing: 13) {
                    quickPrice("65% OFF\(perInch)", prices[0])
                    Color(0x3B3B3B).frame(width: 1, height: 26)
                    quickPrice("75% OFF\(perInch)", prices[1])
                    Spacer()
                    Button(action: onDetails) {
                        HStack(spacing: 5) { Text("All prices").font(.system(size: 11)); Image(systemName: "arrow.right").font(.system(size: 13)) }
                            .foregroundStyle(Theme.gold).padding(.vertical, 10)
                    }
                    .accessibilityLabel("All prices for \(product.model)")
                }
                .padding(.top, 12).padding(.bottom, 13)
                .overlay(alignment: .top) { Color(0x3B3B3B).frame(height: 1) }
            }
            HStack(spacing: 13) {
                Button { perform(.next) } label: {
                    HStack(spacing: 8) { Image(systemName: "arrow.right").font(.system(size: 17)); Text("Next").font(.system(size: 12, weight: .semibold)) }
                        .foregroundStyle(Color(0xEEEEEE)).frame(maxWidth: .infinity).frame(height: 43)
                        .background(Color(0x292929), in: .rect(cornerRadius: 4)).overlay(RoundedRectangle(cornerRadius: 4).stroke(Color(0x4A4A4A)))
                }
                .accessibilityLabel("Next product after \(product.model)")
                Button(action: onToggle) {
                    Image(systemName: saved ? "heart.fill" : "heart").font(.system(size: 22)).foregroundStyle(saved ? Theme.black : Theme.gold)
                        .frame(width: 47, height: 47).background(saved ? Theme.gold : .clear, in: .circle).overlay(Circle().stroke(Theme.gold))
                }
                .accessibilityLabel(saved ? "Unlike model \(product.model)" : "Like model \(product.model)")
                .accessibilityAddTraits(saved ? .isSelected : [])
                Button { perform(.save) } label: {
                    HStack(spacing: 8) { Text("Save").font(.system(size: 12, weight: .bold)); Image(systemName: "heart").font(.system(size: 15)) }
                        .foregroundStyle(Theme.black).frame(maxWidth: .infinity).frame(height: 43).background(Theme.gold, in: .rect(cornerRadius: 4))
                }
                .accessibilityLabel("Save model \(product.model) and continue")
            }
            Text(savedView ? "Your saved collection. Tap the heart to unlike." : "Swipe right to save · Left for next · Scroll to explore")
                .font(.system(size: 8)).tracking(0.1).foregroundStyle(Color(0x9C9C9C)).padding(.top, 12)
        }
        .padding(.horizontal, 17).padding(.top, short ? 13 : 20).padding(.bottom, short ? 10 : 16)
        .background(Theme.ink)
    }

    private func quickPrice(_ label: String, _ value: Double?) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.system(size: 7)).tracking(0.8).foregroundStyle(Color(0xB3B3B3))
            Text(priceAmount(value)).font(.system(size: 14, weight: .semibold).monospacedDigit()).foregroundStyle(.white)
        }
        .frame(minWidth: 66, alignment: .leading)
    }
}

// Maps 0 → from → to onto 0 → 0.4 → 1 for the swipe stamps.
private func ramp(_ value: CGFloat, _ from: CGFloat, _ to: CGFloat) -> Double {
    value <= 0 ? 0 : value < from ? 0.4 * value / from : value < to ? 0.4 + 0.6 * (value - from) / (to - from) : 1
}

struct CatalogImage: View {
    let product: Product

    var body: some View {
        if let src = product.images.first?.src, let url = catalogMediaURL(src, supabaseURL: Config.supabaseURL) {
            AsyncImage(url: url, transaction: Transaction(animation: .easeIn(duration: 0.12))) { phase in
                switch phase {
                case .success(let image): image.resizable().scaledToFit()
                case .failure: missing
                default: ProgressView().tint(Color(0x747474))
                }
            }
            .accessibilityLabel("\(product.category) model \(product.model)")
        } else {
            missing
        }
    }

    private var missing: some View {
        VStack(spacing: 12) {
            Image(systemName: "photo").font(.system(size: 34)).foregroundStyle(Color(0x747474))
            Text("No catalogue picture").font(.system(size: 15, weight: .semibold)).foregroundStyle(Color(0x555555))
            Text("Model \(product.model)").font(.system(size: 11)).foregroundStyle(Color(0x777777))
        }
    }
}
