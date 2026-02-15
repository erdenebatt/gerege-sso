import Foundation
import CryptoKit

enum TOTPService {

    /// Generate a 6-digit TOTP code from a Base32-encoded secret (RFC 6238)
    static func generateCode(secret: String) -> String? {
        guard let keyData = Base32.decode(secret) else { return nil }

        let period: UInt64 = 30
        let counter = UInt64(Date().timeIntervalSince1970) / period

        // Counter to big-endian bytes
        var counterBigEndian = counter.bigEndian
        let counterData = Data(bytes: &counterBigEndian, count: 8)

        // HMAC-SHA1
        let key = SymmetricKey(data: keyData)
        let hmac = Insecure.SHA1.hash(data: counterData, using: key)
        let hmacBytes = Array(hmac)

        // Dynamic truncation
        let offset = Int(hmacBytes[hmacBytes.count - 1] & 0x0F)
        let truncated = (UInt32(hmacBytes[offset]) & 0x7F) << 24
            | UInt32(hmacBytes[offset + 1]) << 16
            | UInt32(hmacBytes[offset + 2]) << 8
            | UInt32(hmacBytes[offset + 3])

        let otp = truncated % 1_000_000
        return String(format: "%06d", otp)
    }

    /// Seconds remaining until next code rotation
    static func remainingSeconds() -> Int {
        30 - (Int(Date().timeIntervalSince1970) % 30)
    }

    /// Parse an otpauth:// URI into components
    static func parseURI(_ uri: String) -> (issuer: String, account: String, secret: String)? {
        guard uri.lowercased().hasPrefix("otpauth://totp/"),
              let url = URL(string: uri) else { return nil }

        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)

        // Extract secret from query params
        guard let secret = components?.queryItems?.first(where: { $0.name == "secret" })?.value else {
            return nil
        }

        // Extract label (path after /totp/)
        let path = url.path // e.g., /Issuer:account or /account
        let label = path.hasPrefix("/") ? String(path.dropFirst()) : path
        let decoded = label.removingPercentEncoding ?? label

        // Split label into issuer:account
        let parts = decoded.split(separator: ":", maxSplits: 1)
        let issuer: String
        let account: String

        if parts.count == 2 {
            issuer = String(parts[0])
            account = String(parts[1])
        } else {
            // Fall back to issuer query param
            issuer = components?.queryItems?.first(where: { $0.name == "issuer" })?.value ?? "Unknown"
            account = decoded
        }

        return (issuer: issuer, account: account, secret: secret.uppercased())
    }
}

// MARK: - HMAC helper using Insecure.SHA1

private extension Insecure.SHA1 {
    static func hash(data: Data, using key: SymmetricKey) -> [UInt8] {
        var hmac = HMAC<Insecure.SHA1>(key: key)
        hmac.update(data: data)
        let mac = hmac.finalize()
        return Array(mac)
    }
}
