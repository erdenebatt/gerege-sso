import SwiftUI

struct AccountCardView: View {
    let account: TOTPAccount
    let code: String?
    let remainingSeconds: Int
    let onDelete: () -> Void

    @State private var showDeleteConfirm = false

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(account.issuer)
                    .font(.headline)
                    .foregroundColor(Constants.Colors.textPrimary)

                Text(account.email)
                    .font(.subheadline)
                    .foregroundColor(Constants.Colors.textSecondary)
                    .lineLimit(1)
            }

            Spacer()

            TOTPCodeView(code: code, remainingSeconds: remainingSeconds)
        }
        .padding(16)
        .background(Constants.Colors.cardBackground)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        .contextMenu {
            Button(role: .destructive) {
                showDeleteConfirm = true
            } label: {
                Label("Устгах", systemImage: "trash")
            }
        }
        .alert("Аккаунт устгах", isPresented: $showDeleteConfirm) {
            Button("Цуцлах", role: .cancel) {}
            Button("Устгах", role: .destructive) { onDelete() }
        } message: {
            Text("\(account.issuer) (\(account.email)) аккаунтыг устгах уу?")
        }
    }
}
