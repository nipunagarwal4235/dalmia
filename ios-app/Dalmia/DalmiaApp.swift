import SwiftUI

@main
struct DalmiaApp: App {
    init() { URLCache.shared = URLCache(memoryCapacity: 32 << 20, diskCapacity: 256 << 20) }

    var body: some Scene {
        WindowGroup { RootView().preferredColorScheme(.dark) }
    }
}

extension Color {
    init(_ hex: UInt32, opacity: Double = 1) {
        self.init(red: Double(hex >> 16 & 0xFF) / 255, green: Double(hex >> 8 & 0xFF) / 255, blue: Double(hex & 0xFF) / 255, opacity: opacity)
    }
}

enum Theme {
    static let black = Color(0x101010)
    static let charcoal = Color(0x222222)
    static let panel = Color(0x171717)
    static let silver = Color(0xE1E2E4)
    static let muted = Color(0xB2B2B2)
    static let line = Color(0x393939)
    static let gold = Color(0xC6A467)
    static let ink = Color(0x202020)
    static let notice = Color(0xE3CA98)
}

struct Brand: View {
    var body: some View {
        HStack(spacing: 7) {
            Image("Monogram").resizable().scaledToFit().frame(width: 32, height: 32)
            Image("Wordmark").resizable().scaledToFit().frame(width: 112, height: 34)
        }
        .accessibilityElement()
        .accessibilityLabel("Dalmia Hardware")
    }
}

// Wraps chips onto new rows.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(proposal.width ?? .infinity, subviews)
        return CGSize(width: proposal.width ?? rows.map(\.maxX).max() ?? 0, height: rows.last.map { $0.y + $0.height } ?? 0)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        for row in arrange(bounds.width, subviews) {
            for (index, x) in zip(row.indices, row.xs) { subviews[index].place(at: CGPoint(x: bounds.minX + x, y: bounds.minY + row.y), proposal: .unspecified) }
        }
    }

    private func arrange(_ width: CGFloat, _ subviews: Subviews) -> [(indices: [Int], xs: [CGFloat], y: CGFloat, height: CGFloat, maxX: CGFloat)] {
        var rows: [(indices: [Int], xs: [CGFloat], y: CGFloat, height: CGFloat, maxX: CGFloat)] = []
        var x: CGFloat = 0, y: CGFloat = 0
        for (index, subview) in subviews.enumerated() {
            let size = subview.sizeThatFits(.unspecified)
            if rows.isEmpty || (x > 0 && x + size.width > width) {
                if let last = rows.last { y = last.y + last.height + spacing }
                rows.append(([], [], y, 0, 0))
                x = 0
            }
            rows[rows.count - 1].indices.append(index)
            rows[rows.count - 1].xs.append(x)
            rows[rows.count - 1].height = max(rows[rows.count - 1].height, size.height)
            rows[rows.count - 1].maxX = x + size.width
            x += size.width + spacing
        }
        return rows
    }
}

struct Chip: View {
    let title: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 12, weight: selected ? .semibold : .regular))
                .foregroundStyle(selected ? Theme.black : Color(0xDDDDDD))
                .padding(.vertical, 10).padding(.horizontal, 13)
                .background(selected ? Theme.gold : Color(0x282828), in: .rect(cornerRadius: 4))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(selected ? Theme.gold : Color(0x474747)))
        }
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
