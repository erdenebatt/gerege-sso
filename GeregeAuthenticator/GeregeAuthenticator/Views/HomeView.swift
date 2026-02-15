import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @StateObject private var viewModel = HomeViewModel()

    @State private var showLogoutConfirm = false

    var body: some View {
        VStack(spacing: 0) {
            // User bar
            HStack {
                Image(systemName: "person.circle.fill")
                    .font(.title2)
                    .foregroundColor(Constants.Colors.primary)

                Text(authViewModel.user?.email ?? "")
                    .font(.subheadline)
                    .foregroundColor(Constants.Colors.textPrimary)
                    .lineLimit(1)

                Spacer()

                Button {
                    showLogoutConfirm = true
                } label: {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .foregroundColor(Constants.Colors.danger)
                }
            }
            .padding()
            .background(Color.white)

            Divider()

            // Content
            if viewModel.accounts.isEmpty {
                emptyState
            } else {
                accountsList
            }

            // Bottom buttons
            bottomButtons
        }
        .background(Constants.Colors.background.ignoresSafeArea())
        .onAppear {
            viewModel.loadAccounts()
            viewModel.startTimer()
        }
        .onDisappear {
            viewModel.stopTimer()
        }
        .alert("Гарах", isPresented: $showLogoutConfirm) {
            Button("Цуцлах", role: .cancel) {}
            Button("Гарах", role: .destructive) { authViewModel.logout() }
        } message: {
            Text("Та гарахдаа итгэлтэй байна уу?")
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "lock.shield")
                .font(.system(size: 64))
                .foregroundColor(.gray.opacity(0.4))

            Text("Аккаунт байхгүй")
                .font(.title3.bold())
                .foregroundColor(Constants.Colors.textSecondary)

            Text("QR код скан хийх эсвэл гараар нэмэх товч дарна уу")
                .font(.subheadline)
                .foregroundColor(Constants.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Spacer()
        }
    }

    private var accountsList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(viewModel.accounts) { account in
                    AccountCardView(
                        account: account,
                        code: viewModel.codes[account.id],
                        remainingSeconds: viewModel.remainingSeconds,
                        onDelete: { viewModel.deleteAccount(id: account.id) }
                    )
                }
            }
            .padding()
        }
    }

    private var bottomButtons: some View {
        HStack(spacing: 12) {
            NavigationLink {
                ScannerView()
            } label: {
                Label("QR Скан", systemImage: "qrcode.viewfinder")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Constants.Colors.primary)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .font(.headline)
            }

            NavigationLink {
                AddAccountView()
            } label: {
                Label("Гараар нэмэх", systemImage: "plus")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.white)
                    .foregroundColor(Constants.Colors.primary)
                    .cornerRadius(12)
                    .font(.headline)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Constants.Colors.primary, lineWidth: 2))
            }
        }
        .padding()
        .background(Color.white)
    }
}
