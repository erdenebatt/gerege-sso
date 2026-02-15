import Foundation

@MainActor
final class ScannerViewModel: ObservableObject {
    @Published var isProcessing = false
    @Published var alertType: AlertType?

    enum AlertType: Identifiable {
        case totpAdded(issuer: String, account: String)
        case qrLoginConfirm(sessionId: String)
        case qrLoginSuccess
        case error(String)

        var id: String {
            switch self {
            case .totpAdded: return "totpAdded"
            case .qrLoginConfirm: return "qrLoginConfirm"
            case .qrLoginSuccess: return "qrLoginSuccess"
            case .error: return "error"
            }
        }
    }

    func handleScannedCode(_ value: String) {
        guard !isProcessing else { return }
        isProcessing = true

        // Check if TOTP URI
        if let parsed = TOTPService.parseURI(value) {
            let account = TOTPAccount(
                issuer: parsed.issuer,
                email: parsed.account,
                secret: parsed.secret
            )
            KeychainService.saveTOTPAccount(account)
            alertType = .totpAdded(issuer: parsed.issuer, account: parsed.account)
            return
        }

        // Check if QR Login URL
        if let sessionId = extractQRSessionId(from: value) {
            // Mark as scanned (fire-and-forget)
            Task {
                try? await APIClient.shared.markQRScanned(sessionId: sessionId)
            }
            alertType = .qrLoginConfirm(sessionId: sessionId)
            return
        }

        // Unknown QR code
        alertType = .error("Танигдаагүй QR код")
        isProcessing = false
    }

    func approveQRLogin(sessionId: String) {
        Task {
            do {
                _ = try await APIClient.shared.approveQR(sessionId: sessionId)
                alertType = .qrLoginSuccess
            } catch {
                alertType = .error(error.localizedDescription)
            }
            isProcessing = false
        }
    }

    func resetProcessing() {
        isProcessing = false
    }

    private func extractQRSessionId(from urlString: String) -> String? {
        guard urlString.contains("sso.gerege.mn") || urlString.contains("/qr/scan"),
              let url = URL(string: urlString),
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let sessionId = components.queryItems?.first(where: { $0.name == "session" })?.value else {
            return nil
        }
        return sessionId
    }
}
