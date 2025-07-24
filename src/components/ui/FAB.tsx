import React from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const FAB = ({ icon, label, onPress, style, accessibilityLabel }) => (
  <Pressable
    style={({ pressed }) => [styles.fab, style, pressed && styles.pressed]}
    onPress={onPress}
    accessible={true}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel || label}
  >
    <View style={styles.iconContainer}>
      <MaterialCommunityIcons name={icon} size={28} color="#fff" />
    </View>
    {label && <Text style={styles.label}>{label}</Text>}
  </Pressable>
);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: '#2563EB', // primary-500
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    zIndex: 100,
  },
  pressed: {
    backgroundColor: '#1D4ED8',
  },
  iconContainer: {
    marginRight: 8,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});