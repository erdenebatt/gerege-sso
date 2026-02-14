import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import TOTPCode from './TOTPCode';
import { TOTPAccount } from '../lib/storage';

interface AccountCardProps {
  account: TOTPAccount;
  onDelete: (id: string) => void;
}

export default function AccountCard({ account, onDelete }: AccountCardProps) {
  const handleLongPress = () => {
    Alert.alert(
      'Аккаунт устгах',
      `${account.issuer} (${account.email}) аккаунтыг устгах уу?`,
      [
        { text: 'Болих', style: 'cancel' },
        {
          text: 'Устгах',
          style: 'destructive',
          onPress: () => onDelete(account.id),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.info}>
        <Text style={styles.issuer}>{account.issuer || 'Unknown'}</Text>
        <Text style={styles.email} numberOfLines={1}>
          {account.email}
        </Text>
      </View>
      <TOTPCode secret={account.secret} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  info: {
    flex: 1,
    marginRight: 16,
  },
  issuer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  email: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});
