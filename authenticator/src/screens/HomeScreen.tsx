import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/authStore';
import { getTOTPAccounts, removeTOTPAccount, TOTPAccount } from '../lib/storage';
import AccountCard from '../components/AccountCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [accounts, setAccounts] = useState<TOTPAccount[]>([]);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [])
  );

  const loadAccounts = async () => {
    const accs = await getTOTPAccounts();
    setAccounts(accs);
  };

  const handleDelete = async (id: string) => {
    await removeTOTPAccount(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleLogout = () => {
    Alert.alert('Гарах', 'Гарах уу?', [
      { text: 'Болих', style: 'cancel' },
      { text: 'Гарах', style: 'destructive', onPress: logout },
    ]);
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>Гарах</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      {user && (
        <View style={styles.userBar}>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
      )}

      {accounts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔐</Text>
          <Text style={styles.emptyTitle}>Аккаунт байхгүй</Text>
          <Text style={styles.emptyText}>
            QR код скан хийж эсвэл гараар аккаунт нэмнэ үү
          </Text>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AccountCard account={item} onDelete={handleDelete} />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => navigation.navigate('Scanner', {})}
        >
          <Text style={styles.scanIcon}>📷</Text>
          <Text style={styles.scanText}>QR Скан</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddAccount')}
        >
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.addText}>Гараар нэмэх</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  headerBtn: {
    paddingHorizontal: 8,
  },
  headerBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  userBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userEmail: {
    fontSize: 13,
    color: '#6b7280',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  scanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a56db',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#1a56db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanIcon: {
    fontSize: 18,
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  addIcon: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  addText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
});
