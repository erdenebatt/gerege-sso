import SwiftUI

struct TOTPCodeView: View {
    let code: String?
    let remainingSeconds: Int

    private var isLow: Bool { remainingSeconds <= 5 }

    private var formattedCode: String {
        guard let code else { return "--- ---" }
        let prefix = String(code.prefix(3))
        let suffix = String(code.suffix(3))
        return "\(prefix) \(suffix)"
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: 4) {
            Text(formattedCode)
                .font(.system(size: 28, weight: .bold, design: .monospaced))
                .foregroundColor(isLow ? Constants.Colors.danger : Constants.Colors.primary)

            HStack(spacing: 6) {
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 4)

                        RoundedRectangle(cornerRadius: 2)
                            .fill(isLow ? Constants.Colors.danger : Constants.Colors.primary)
                            .frame(width: geometry.size.width * CGFloat(remainingSeconds) / 30.0, height: 4)
                            .animation(.linear(duration: 1), value: remainingSeconds)
                    }
                }
                .frame(height: 4)

                Text("\(remainingSeconds)с")
                    .font(.caption2)
                    .foregroundColor(isLow ? Constants.Colors.danger : Constants.Colors.textSecondary)
                    .frame(width: 24, alignment: .trailing)
            }
        }
    }
}
