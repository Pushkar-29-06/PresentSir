import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function AuthPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PresentSir</Text>
      <Text>Authentication screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
});
