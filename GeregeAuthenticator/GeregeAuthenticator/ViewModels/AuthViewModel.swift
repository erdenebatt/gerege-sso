import Foundation

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var token: String?
    @Published var user: User?
    @Published var isLoading = true
    @Published var error: String?

    var isAuthenticated: Bool { token != nil && user != nil }

    func checkAuth() async {
        isLoading = true
        defer { isLoading = false }

        guard let savedToken = KeychainService.getToken() else { return }
        token = savedToken

        do {
            user = try await APIClient.shared.getMe()
        } catch {
            // Token invalid — clear it
            token = nil
            KeychainService.removeToken()
        }
    }

    func login(email: String, otp: String) async throws {
        // 1. Verify OTP → get auth code
        let verifyResponse = try await APIClient.shared.verifyEmailOTP(email: email, otp: otp)

        // 2. Exchange code → get JWT token
        let exchangeResponse = try await APIClient.shared.exchangeToken(code: verifyResponse.code)

        // 3. Save token
        KeychainService.saveToken(exchangeResponse.token)
        token = exchangeResponse.token

        // 4. Fetch user info
        user = try await APIClient.shared.getMe()
    }

    func logout() {
        KeychainService.removeToken()
        token = nil
        user = nil
    }
}
