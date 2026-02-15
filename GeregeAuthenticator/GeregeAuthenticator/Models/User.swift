import Foundation

struct User: Codable, Identifiable {
    let id: Int?
    let genId: String?
    let email: String
    let picture: String?
    let verified: Bool?
    let mfaEnabled: Bool?
    let mfaLevel: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case genId = "gen_id"
        case email
        case picture
        case verified
        case mfaEnabled = "mfa_enabled"
        case mfaLevel = "mfa_level"
    }
}
