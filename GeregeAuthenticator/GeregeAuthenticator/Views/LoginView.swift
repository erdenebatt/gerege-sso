import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel

    @State private var email = ""
    @State private var otp = ""
    @State private var otpSent = false
    @State private var isLoading = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Logo
            Text("G")
                .font(.system(size: 56, weight: .bold))
                .foregroundColor(.white)
                .frame(width: 100, height: 100)
                .background(Constants.Colors.primary)
                .cornerRadius(24)

            Text("Gerege Authenticator")
                .font(.title2.bold())
                .foregroundColor(Constants.Colors.textPrimary)

            // Form
            VStack(spacing: 16) {
                if !otpSent {
                    // Email input
                    TextField("Имэйл хаяг", text: $email)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .padding()
                        .background(Color.white)
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.gray.opacity(0.3)))

                    Button {
                        sendOTP()
                    } label: {
                        Group {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Код авах")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(email.isEmpty ? Color.gray : Constants.Colors.primary)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .font(.headline)
                    }
                    .disabled(email.isEmpty || isLoading)
                } else {
                    // OTP input
                    HStack {
                        Text(email)
                            .font(.subheadline)
                            .foregroundColor(Constants.Colors.textSecondary)

                        Spacer()

                        Button("Өөрчлөх") {
                            otpSent = false
                            otp = ""
                            error = nil
                        }
                        .font(.subheadline)
                        .foregroundColor(Constants.Colors.primary)
                    }

                    TextField("6 оронтой код", text: $otp)
                        .keyboardType(.numberPad)
                        .textContentType(.oneTimeCode)
                        .padding()
                        .background(Color.white)
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.gray.opacity(0.3)))

                    Button {
                        login()
                    } label: {
                        Group {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Нэвтрэх")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(otp.count < 6 ? Color.gray : Constants.Colors.primary)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .font(.headline)
                    }
                    .disabled(otp.count < 6 || isLoading)
                }
            }
            .padding(.horizontal, 24)

            if let error {
                Text(error)
                    .font(.footnote)
                    .foregroundColor(Constants.Colors.danger)
                    .padding(.horizontal, 24)
            }

            Spacer()
            Spacer()
        }
        .background(Constants.Colors.background.ignoresSafeArea())
    }

    private func sendOTP() {
        isLoading = true
        error = nil

        Task {
            do {
                _ = try await APIClient.shared.sendEmailOTP(email: email)
                otpSent = true
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func login() {
        isLoading = true
        error = nil

        Task {
            do {
                try await authViewModel.login(email: email, otp: otp)
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        }
    }
}
