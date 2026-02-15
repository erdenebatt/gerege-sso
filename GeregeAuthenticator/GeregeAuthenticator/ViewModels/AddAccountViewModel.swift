import Foundation

@MainActor
final class AddAccountViewModel: ObservableObject {
    @Published var issuer = ""
    @Published var email = ""
    @Published var secret = ""
    @Published var error: String?

    func addAccount() -> Bool {
        let cleanedSecret = secret.uppercased().filter { !$0.isWhitespace }

        guard !email.isEmpty else {
            error = "Имэйл/аккаунт оруулна уу"
            return false
        }

        guard !cleanedSecret.isEmpty else {
            error = "Нууц түлхүүр оруулна уу"
            return false
        }

        // Validate that the secret is valid Base32
        guard Base32.decode(cleanedSecret) != nil else {
            error = "Буруу нууц түлхүүр (Base32 формат байх ёстой)"
            return false
        }

        let account = TOTPAccount(
            issuer: issuer.isEmpty ? "Unknown" : issuer,
            email: email,
            secret: cleanedSecret
        )

        KeychainService.saveTOTPAccount(account)
        error = nil
        return true
    }
}
