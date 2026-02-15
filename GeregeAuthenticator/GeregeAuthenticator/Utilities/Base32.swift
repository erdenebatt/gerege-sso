import Foundation

enum Base32 {
    private static let alphabet = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567")

    static func decode(_ input: String) -> Data? {
        let cleaned = input.uppercased().filter { $0 != "=" && $0 != " " && $0 != "-" }
        var bits = 0
        var accumulator = 0
        var output = [UInt8]()

        for char in cleaned {
            guard let index = alphabet.firstIndex(of: char) else { return nil }
            accumulator = (accumulator << 5) | alphabet.distance(from: alphabet.startIndex, to: index)
            bits += 5

            if bits >= 8 {
                bits -= 8
                output.append(UInt8((accumulator >> bits) & 0xFF))
            }
        }

        return Data(output)
    }
}
