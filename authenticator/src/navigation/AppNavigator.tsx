import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ScannerScreen from '../screens/ScannerScreen';
import AddAccountScreen from '../screens/AddAccountScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Scanner: { mode?: 'qr_login' | 'totp' } | undefined;
  AddAccount: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { token, loading } = useAuthStore();

  if (loading) return null;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a56db' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {!token ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Gerege Authenticator' }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Gerege Authenticator' }}
          />
          <Stack.Screen
            name="Scanner"
            component={ScannerScreen}
            options={{ title: 'QR Скан' }}
          />
          <Stack.Screen
            name="AddAccount"
            component={AddAccountScreen}
            options={{ title: 'Аккаунт нэмэх' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
