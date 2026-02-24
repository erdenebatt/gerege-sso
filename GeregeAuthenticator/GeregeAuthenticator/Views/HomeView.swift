import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        VStack(spacing: 0) {
            // Header bar
            HStack {
                Text("G")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 36, height: 36)
                    .background(Constants.Colors.primary)
                    .cornerRadius(8)

                Text("Gerege Authenticator")
                    .font(.headline)
                    .foregroundColor(Constants.Colors.textPrimary)

                Spacer()
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
        .navigationTitle("")
        .navigationBarHidden(true)
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
