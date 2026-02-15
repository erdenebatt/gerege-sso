import SwiftUI

struct AddAccountView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = AddAccountViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // QR scan shortcut
                NavigationLink {
                    ScannerView()
                } label: {
                    HStack {
                        Image(systemName: "qrcode.viewfinder")
                            .font(.title2)
                        Text("QR код скан хийх")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Constants.Colors.primary.opacity(0.1))
                    .foregroundColor(Constants.Colors.primary)
                    .cornerRadius(12)
                }

                // Divider
                HStack {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 1)
                    Text("эсвэл")
                        .font(.caption)
                        .foregroundColor(Constants.Colors.textSecondary)
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 1)
                }

                // Manual entry form
                VStack(spacing: 16) {
                    formField(title: "Үйлчилгээний нэр (заавал биш)", text: $viewModel.issuer, placeholder: "Google, GitHub...")

                    formField(title: "Имэйл / Аккаунт", text: $viewModel.email, placeholder: "user@example.com")
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)

                    formField(title: "Нууц түлхүүр (Secret Key)", text: $viewModel.secret, placeholder: "JBSWY3DPEHPK3PXP")
                        .autocapitalization(.allCharacters)
                        .disableAutocorrection(true)
                }

                if let error = viewModel.error {
                    Text(error)
                        .font(.footnote)
                        .foregroundColor(Constants.Colors.danger)
                }

                Button {
                    if viewModel.addAccount() {
                        dismiss()
                    }
                } label: {
                    Text("Аккаунт нэмэх")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Constants.Colors.primary)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .font(.headline)
                }
            }
            .padding()
        }
        .background(Constants.Colors.background.ignoresSafeArea())
        .navigationTitle("Аккаунт нэмэх")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func formField(title: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundColor(Constants.Colors.textSecondary)

            TextField(placeholder, text: text)
                .padding()
                .background(Color.white)
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.gray.opacity(0.3)))
        }
    }
}
