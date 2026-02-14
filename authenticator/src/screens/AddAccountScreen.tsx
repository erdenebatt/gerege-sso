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
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { saveTOTPAccount } from '../lib/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'AddAccount'>;

export default function AddAccountScreen({ navigation }: Props) {
  const [issuer, setIssuer] = useState('');
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');

  const handleScanQR = () => {
    navigation.navigate('Scanner', { mode: 'totp' });
  };

  const handleAdd = async () => {
    if (!secret.trim()) {
      Alert.alert('Алдаа', 'Secret key оруулна уу');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Алдаа', 'Аккаунт нэр/и-мэйл оруулна уу');
      return;
    }

    try {
      await saveTOTPAccount({
        issuer: issuer.trim() || 'Unknown',
        email: email.trim(),
        secret: secret.trim().replace(/\s/g, '').toUpperCase(),
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Алдаа', 'Аккаунт нэмэхэд алдаа гарлаа');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.scanButton} onPress={handleScanQR}>
          <Text style={styles.scanIcon}>📷</Text>
          <Text style={styles.scanText}>QR код скан хийх</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>эсвэл гараар оруулах</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.label}>Үйлчилгээ (Issuer)</Text>
        <TextInput
          style={styles.input}
          placeholder="Gerege SSO, Google, GitHub..."
          placeholderTextColor="#9ca3af"
          value={issuer}
          onChangeText={setIssuer}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Аккаунт нэр / И-мэйл</Text>
        <TextInput
          style={styles.input}
          placeholder="user@example.com"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Secret Key</Text>
        <TextInput
          style={styles.input}
          placeholder="JBSWY3DPEHPK3PXP"
          placeholderTextColor="#9ca3af"
          value={secret}
          onChangeText={setSecret}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Аккаунт нэмэх</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 24,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a56db',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  scanIcon: {
    fontSize: 20,
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d1d5db',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#9ca3af',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
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
  },
  addButton: {
    backgroundColor: '#1a56db',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
