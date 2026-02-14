import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { generateTOTPCode, getRemainingSeconds } from '../lib/totp';

interface TOTPCodeProps {
  secret: string;
}

export default function TOTPCode({ secret }: TOTPCodeProps) {
  const [code, setCode] = useState(() => generateTOTPCode(secret));
  const [remaining, setRemaining] = useState(() => getRemainingSeconds());

  useEffect(() => {
    const interval = setInterval(() => {
      const r = getRemainingSeconds();
      setRemaining(r);
      if (r === 30) {
        setCode(generateTOTPCode(secret));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [secret]);

  // Refresh code when secret changes
  useEffect(() => {
    setCode(generateTOTPCode(secret));
  }, [secret]);

  const isLow = remaining <= 5;
  const formatted = code.slice(0, 3) + ' ' + code.slice(3);

  return (
    <View style={styles.container}>
      <Text style={[styles.code, isLow && styles.codeLow]}>{formatted}</Text>
      <View style={styles.timerContainer}>
        <View style={styles.timerBg}>
          <View
            style={[
              styles.timerFill,
              { width: `${(remaining / 30) * 100}%` },
              isLow && styles.timerFillLow,
            ]}
          />
        </View>
        <Text style={[styles.timerText, isLow && styles.timerTextLow]}>
          {remaining}с
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
  },
  code: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#1a56db',
    letterSpacing: 2,
  },
  codeLow: {
    color: '#dc2626',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  timerBg: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#1a56db',
  },
  timerFillLow: {
    backgroundColor: '#dc2626',
  },
  timerText: {
    fontSize: 12,
    color: '#6b7280',
    fontVariant: ['tabular-nums'],
  },
  timerTextLow: {
    color: '#dc2626',
  },
});
