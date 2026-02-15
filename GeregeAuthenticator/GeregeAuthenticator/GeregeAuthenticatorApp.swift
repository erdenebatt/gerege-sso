import SwiftUI

@main
struct GeregeAuthenticatorApp: App {
    @StateObject private var authViewModel = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authViewModel)
                .task {
                    await authViewModel.checkAuth()
                }
        }
    }
}
