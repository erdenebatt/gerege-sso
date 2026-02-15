import Foundation

// MARK: - Request Models

struct SendOTPRequest: Codable {
    let email: String
}

struct VerifyOTPRequest: Codable {
    let email: String
    let otp: String
}

struct ExchangeTokenRequest: Codable {
    let code: String
}

struct QRScanRequest: Codable {
    let sessionId: String

    enum CodingKeys: String, CodingKey {
        case sessionId = "session_id"
    }
}

struct QRApproveRequest: Codable {
    let sessionId: String

    enum CodingKeys: String, CodingKey {
        case sessionId = "session_id"
    }
}

// MARK: - Response Models

struct SendOTPResponse: Codable {
    let message: String?
}

struct VerifyOTPResponse: Codable {
    let code: String
    let mfaRequired: Bool?

    enum CodingKeys: String, CodingKey {
        case code
        case mfaRequired = "mfa_required"
    }
}

struct ExchangeTokenResponse: Codable {
    let token: String
    let mfaRequired: Bool?

    enum CodingKeys: String, CodingKey {
        case token
        case mfaRequired = "mfa_required"
    }
}

struct MeResponse: Codable {
    let user: User
}

struct QRScanResponse: Codable {
    let message: String?
}

struct QRApproveResponse: Codable {
    let message: String?
}

struct APIErrorResponse: Codable {
    let error: String?
    let message: String?

    var errorMessage: String {
        error ?? message ?? "Unknown error"
    }
}
