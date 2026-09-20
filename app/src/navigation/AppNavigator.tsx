/**
 * Main App Navigator
 * Handles authenticated user navigation
 */

import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomePlaceholderScreen } from '../screens/home/HomePlaceholderScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function AppDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomePlaceholderScreen}
      />
    </Drawer.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Drawer"
        component={AppDrawer}
      />
    </Stack.Navigator>
  );
}