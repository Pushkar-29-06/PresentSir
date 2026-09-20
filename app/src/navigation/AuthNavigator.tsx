/**
 * Authentication Navigator
 * Handles login and device registration flows
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthPlaceholderScreen } from '../screens/auth/AuthPlaceholderScreen';

const Stack = createNativeStackNavigator();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="AuthPlaceholder"
        component={AuthPlaceholderScreen}
      />
    </Stack.Navigator>
  );
}