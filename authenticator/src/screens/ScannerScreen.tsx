import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { parseTOTPUri } from '../lib/totp';
import { saveTOTPAccount } from '../lib/storage';
import * as api from '../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Scanner'>;

export default function ScannerScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const scannedRef = useRef(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current || processing) return;
    scannedRef.current = true;
    setProcessing(true);

    try {
      // Check if it's a TOTP URI
      const totpData = parseTOTPUri(data);
      if (totpData) {
        await saveTOTPAccount({
          issuer: totpData.issuer,
          email: totpData.account,
          secret: totpData.secret,
        });
        Alert.alert(
          'Амжилттай',
          `${totpData.issuer || 'TOTP'} аккаунт нэмэгдлээ`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Check if it's a QR Login URL
      const sessionId = parseQRLoginUrl(data);
      if (sessionId) {
        await handleQRLogin(sessionId);
        return;
      }

      Alert.alert('Алдаа', 'Танигдаагүй QR код', [
        { text: 'OK', onPress: resetScanner },
      ]);
    } catch (e: any) {
      Alert.alert('Алдаа', e.message || 'QR код боловсруулахад алдаа гарлаа', [
        { text: 'OK', onPress: resetScanner },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const parseQRLoginUrl = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      if (
        parsed.hostname === 'sso.gerege.mn' &&
        parsed.pathname === '/qr/scan'
      ) {
        return parsed.searchParams.get('session');
      }
    } catch {}
    return null;
  };

  const handleQRLogin = async (sessionId: string) => {
    try {
      await api.markQRScanned(sessionId);
    } catch {}

    Alert.alert(
      'Нэвтрэлт зөвшөөрөх',
      'Компьютер дээрээ нэвтрэх гэж байна. Зөвшөөрөх үү?',
      [
        {
          text: 'Болих',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
        {
          text: 'Зөвшөөрөх',
          onPress: async () => {
            try {
              await api.approveQR(sessionId);
              Alert.alert('Амжилттай', 'Нэвтрэлт зөвшөөрөгдлөө', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              Alert.alert('Алдаа', e.message || 'Зөвшөөрөхөд алдаа гарлаа', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            }
          },
        },
      ]
    );
  };

  const resetScanner = () => {
    scannedRef.current = false;
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>
          Камерын зөвшөөрөл шаардлагатай
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Зөвшөөрөх</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={processing ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.hint}>
            QR кодыг фрэйм дотор байрлуулна уу
          </Text>
          {processing && (
            <ActivityIndicator
              size="large"
              color="#fff"
              style={styles.spinner}
            />
          )}
        </View>
      </CameraView>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#fff',
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#fff',
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#fff',
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#fff',
  },
  hint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: '#1a56db',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
