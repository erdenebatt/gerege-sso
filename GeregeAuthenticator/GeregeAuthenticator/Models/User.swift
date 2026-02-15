import Foundation

struct User: Codable, Identifiable {
    var id: String { genId }

    let genId: String
    let email: String
    let picture: String?
    let verified: Bool?
    let verificationLevel: Int?
    let mfaEnabled: Bool?
    let mfaLevel: Int?

    enum CodingKeys: String, CodingKey {
        case genId = "gen_id"
        case email
        case picture
        case verified
        case verificationLevel = "verification_level"
        case mfaEnabled = "mfa_enabled"
        case mfaLevel = "mfa_level"
    }
}
