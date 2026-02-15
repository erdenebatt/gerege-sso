import SwiftUI
import AVFoundation

struct ScannerView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = ScannerViewModel()

    @State private var cameraPermission: AVAuthorizationStatus = .notDetermined

    var body: some View {
        ZStack {
            if cameraPermission == .authorized {
                cameraView
            } else if cameraPermission == .denied || cameraPermission == .restricted {
                permissionDeniedView
            } else {
                Color.black.ignoresSafeArea()
                    .onAppear { requestCameraPermission() }
            }

            if viewModel.isProcessing {
                Color.black.opacity(0.5).ignoresSafeArea()
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.5)
            }
        }
        .navigationTitle("QR Скан")
        .navigationBarTitleDisplayMode(.inline)
        .alert(item: $viewModel.alertType) { alertType in
            makeAlert(for: alertType)
        }
        .onAppear {
            checkCameraPermission()
        }
    }

    private var cameraView: some View {
        ZStack {
            QRScannerRepresentable { code in
                viewModel.handleScannedCode(code)
            }
            .ignoresSafeArea()

            // Scan frame overlay
            scanOverlay
        }
    }

    private var scanOverlay: some View {
        VStack {
            Spacer()

            ZStack {
                // Semi-transparent background
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.white, lineWidth: 3)
                    .frame(width: 250, height: 250)

                // Corner brackets
                ForEach(0..<4) { index in
                    CornerBracket()
                        .stroke(Constants.Colors.primary, lineWidth: 4)
                        .frame(width: 40, height: 40)
                        .offset(
                            x: (index % 2 == 0 ? -105 : 105),
                            y: (index < 2 ? -105 : 105)
                        )
                        .rotationEffect(.degrees(Double(index) * 90))
                }
            }

            Text("QR кодыг хүрээнд байрлуулна уу")
                .font(.subheadline)
                .foregroundColor(.white)
                .padding(.top, 24)
                .shadow(radius: 2)

            Spacer()
        }
    }

    private var permissionDeniedView: some View {
        VStack(spacing: 16) {
            Image(systemName: "camera.fill")
                .font(.system(size: 48))
                .foregroundColor(.gray)

            Text("Камерын зөвшөөрөл шаардлагатай")
                .font(.headline)

            Text("QR код скан хийхэд камер ашиглана")
                .font(.subheadline)
                .foregroundColor(Constants.Colors.textSecondary)

            Button("Тохиргоо нээх") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            }
            .padding()
            .background(Constants.Colors.primary)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
    }

    private func makeAlert(for type: ScannerViewModel.AlertType) -> Alert {
        switch type {
        case .totpAdded(let issuer, let account):
            return Alert(
                title: Text("Аккаунт нэмэгдлээ"),
                message: Text("\(issuer) (\(account))"),
                dismissButton: .default(Text("OK")) { dismiss() }
            )
        case .qrLoginConfirm(let sessionId):
            return Alert(
                title: Text("Нэвтрэлт зөвшөөрөх"),
                message: Text("Компьютер дээр нэвтрэхийг зөвшөөрөх үү?"),
                primaryButton: .default(Text("Зөвшөөрөх")) {
                    viewModel.approveQRLogin(sessionId: sessionId)
                },
                secondaryButton: .cancel(Text("Цуцлах")) {
                    viewModel.resetProcessing()
                }
            )
        case .qrLoginSuccess:
            return Alert(
                title: Text("Амжилттай"),
                message: Text("Компьютер дээр нэвтрэлт амжилттай"),
                dismissButton: .default(Text("OK")) { dismiss() }
            )
        case .error(let message):
            return Alert(
                title: Text("Алдаа"),
                message: Text(message),
                dismissButton: .default(Text("OK")) {
                    viewModel.resetProcessing()
                }
            )
        }
    }

    private func checkCameraPermission() {
        cameraPermission = AVCaptureDevice.authorizationStatus(for: .video)
    }

    private func requestCameraPermission() {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                cameraPermission = granted ? .authorized : .denied
            }
        }
    }
}

// MARK: - Corner Bracket Shape

struct CornerBracket: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        return path
    }
}
