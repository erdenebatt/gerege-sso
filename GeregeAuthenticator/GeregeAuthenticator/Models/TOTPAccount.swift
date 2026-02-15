import Foundation

struct TOTPAccount: Codable, Identifiable {
    let id: String
    let issuer: String
    let email: String
    let secret: String
    let createdAt: TimeInterval

    init(id: String = "\(Int(Date().timeIntervalSince1970 * 1000))", issuer: String, email: String, secret: String, createdAt: TimeInterval = Date().timeIntervalSince1970) {
        self.id = id
        self.issuer = issuer
        self.email = email
        self.secret = secret
        self.createdAt = createdAt
    }
}
