import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel

    var body: some View {
        Group {
            if authViewModel.isLoading {
                loadingView
            } else if authViewModel.isAuthenticated {
                NavigationStack {
                    HomeView()
                }
            } else {
                LoginView()
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: 16) {
            Text("G")
                .font(.system(size: 48, weight: .bold))
                .foregroundColor(.white)
                .frame(width: 80, height: 80)
                .background(Constants.Colors.primary)
                .cornerRadius(20)

            ProgressView()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Constants.Colors.background.ignoresSafeArea())
    }
}
