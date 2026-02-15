import Foundation
import Combine

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var accounts: [TOTPAccount] = []
    @Published var codes: [String: String] = [:]
    @Published var remainingSeconds: Int = 30

    private var timer: Timer?

    func loadAccounts() {
        accounts = KeychainService.getTOTPAccounts()
        regenerateCodes()
    }

    func startTimer() {
        remainingSeconds = TOTPService.remainingSeconds()
        regenerateCodes()

        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                let prev = self.remainingSeconds
                self.remainingSeconds = TOTPService.remainingSeconds()

                // Regenerate codes on 30s boundary
                if self.remainingSeconds > prev {
                    self.regenerateCodes()
                }
            }
        }
    }

    func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    func deleteAccount(id: String) {
        KeychainService.removeTOTPAccount(id: id)
        accounts.removeAll { $0.id == id }
        codes.removeValue(forKey: id)
    }

    private func regenerateCodes() {
        for account in accounts {
            codes[account.id] = TOTPService.generateCode(secret: account.secret)
        }
    }
}
