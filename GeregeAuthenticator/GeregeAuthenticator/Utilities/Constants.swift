import SwiftUI

enum Constants {
    static let apiBaseURL = "https://sso.gerege.mn"

    enum KeychainKeys {
        static let jwtToken = "gerege_jwt_token"
        static let totpAccounts = "gerege_totp_accounts"
    }

    enum Colors {
        static let primary = Color(hex: "#1a56db")
        static let background = Color(hex: "#f3f4f6")
        static let cardBackground = Color.white
        static let textPrimary = Color(hex: "#111827")
        static let textSecondary = Color(hex: "#6b7280")
        static let danger = Color(hex: "#dc2626")
        static let success = Color(hex: "#16a34a")
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .init(charactersIn: "#"))
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)

        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}
