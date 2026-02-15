import Foundation

actor APIClient {
    static let shared = APIClient()

    private let baseURL = Constants.apiBaseURL
    private let session = URLSession.shared
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        return d
    }()
    private let encoder = JSONEncoder()

    private init() {}

    // MARK: - Auth Endpoints

    func sendEmailOTP(email: String) async throws -> SendOTPResponse {
        try await post("/api/auth/email/send-otp", body: SendOTPRequest(email: email), authenticated: false)
    }

    func verifyEmailOTP(email: String, otp: String) async throws -> VerifyOTPResponse {
        try await post("/api/auth/email/verify-otp", body: VerifyOTPRequest(email: email, otp: otp), authenticated: false)
    }

    func exchangeToken(code: String) async throws -> ExchangeTokenResponse {
        try await post("/api/auth/exchange-token", body: ExchangeTokenRequest(code: code), authenticated: false)
    }

    func getMe() async throws -> User {
        let response: MeResponse = try await get("/api/auth/me", authenticated: true)
        return response.user
    }

    // MARK: - QR Login Endpoints

    func markQRScanned(sessionId: String) async throws -> QRScanResponse {
        try await post("/api/auth/qr/scan", body: QRScanRequest(sessionId: sessionId), authenticated: false)
    }

    func approveQR(sessionId: String) async throws -> QRApproveResponse {
        try await post("/api/auth/qr/approve", body: QRApproveRequest(sessionId: sessionId), authenticated: true)
    }

    // MARK: - Generic Request Methods

    private func get<T: Decodable>(_ path: String, authenticated: Bool) async throws -> T {
        var request = URLRequest(url: URL(string: baseURL + path)!)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if authenticated, let token = KeychainService.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await session.data(for: request)
        try validateResponse(response, data: data)
        return try decoder.decode(T.self, from: data)
    }

    private func post<B: Encodable, T: Decodable>(_ path: String, body: B, authenticated: Bool) async throws -> T {
        var request = URLRequest(url: URL(string: baseURL + path)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)

        if authenticated, let token = KeychainService.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await session.data(for: request)
        try validateResponse(response, data: data)
        return try decoder.decode(T.self, from: data)
    }

    private func validateResponse(_ response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data) {
                throw APIError.server(errorResponse.errorMessage)
            }
            throw APIError.httpError(httpResponse.statusCode)
        }
    }
}

enum APIError: LocalizedError {
    case invalidResponse
    case httpError(Int)
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "Server error (\(code))"
        case .server(let message):
            return message
        }
    }
}
