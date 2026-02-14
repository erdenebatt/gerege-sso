import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { sendEmailOTP } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert('Алдаа', 'И-мэйл хаягаа оруулна уу');
      return;
    }
    setLoading(true);
    try {
      await sendEmailOTP(email.trim());
      setOtpSent(true);
    } catch (e: any) {
      Alert.alert('Алдаа', e.message || 'OTP илгээхэд алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (otp.length !== 6) {
      Alert.alert('Алдаа', '6 оронтой кодоо оруулна уу');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), otp);
    } catch (e: any) {
      Alert.alert('Алдаа', e.message || 'Нэвтрэхэд алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>G</Text>
        </View>
        <Text style={styles.title}>Gerege Authenticator</Text>
        <Text style={styles.subtitle}>И-мэйл хаягаар нэвтрэх</Text>

        <TextInput
          style={styles.input}
          placeholder="И-мэйл хаяг"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!otpSent}
        />

        {otpSent && (
          <>
            <Text style={styles.otpHint}>
              {email} хаяг руу илгээсэн 6 оронтой кодоо оруулна уу
            </Text>
            <TextInput
              style={styles.input}
              placeholder="6 оронтой код"
              placeholderTextColor="#9ca3af"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={otpSent ? handleLogin : handleSendOTP}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {otpSent ? 'Нэвтрэх' : 'OTP илгээх'}
            </Text>
          )}
        </TouchableOpacity>

        {otpSent && (
          <TouchableOpacity
            style={styles.resendButton}
            onPress={() => {
              setOtpSent(false);
              setOtp('');
            }}
          >
            <Text style={styles.resendText}>И-мэйл хаяг солих</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#1a56db',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  otpHint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1a56db',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendText: {
    color: '#1a56db',
    fontSize: 14,
  },
});
