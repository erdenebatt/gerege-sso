import Foundation
import Security

enum KeychainService {

    // MARK: - Generic Keychain Operations

    static func save(key: String, data: Data) -> Bool {
        delete(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: "mn.gerege.authenticator",
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    static func load(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: "mn.gerege.authenticator",
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else { return nil }
        return result as? Data
    }

    @discardableResult
    static func delete(key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: "mn.gerege.authenticator"
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    // MARK: - JWT Token

    static func saveToken(_ token: String) {
        guard let data = token.data(using: .utf8) else { return }
        save(key: Constants.KeychainKeys.jwtToken, data: data)
    }

    static func getToken() -> String? {
        guard let data = load(key: Constants.KeychainKeys.jwtToken) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func removeToken() {
        delete(key: Constants.KeychainKeys.jwtToken)
    }

    // MARK: - TOTP Accounts

    static func getTOTPAccounts() -> [TOTPAccount] {
        guard let data = load(key: Constants.KeychainKeys.totpAccounts),
              let accounts = try? JSONDecoder().decode([TOTPAccount].self, from: data) else {
            return []
        }
        return accounts
    }

    static func saveTOTPAccount(_ account: TOTPAccount) {
        var accounts = getTOTPAccounts()
        accounts.append(account)
        saveTOTPAccounts(accounts)
    }

    static func removeTOTPAccount(id: String) {
        var accounts = getTOTPAccounts()
        accounts.removeAll { $0.id == id }
        saveTOTPAccounts(accounts)
    }

    private static func saveTOTPAccounts(_ accounts: [TOTPAccount]) {
        guard let data = try? JSONEncoder().encode(accounts) else { return }
        save(key: Constants.KeychainKeys.totpAccounts, data: data)
    }
}
