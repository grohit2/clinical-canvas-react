import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const ActionButton = ({ icon, label, onPress, accessibilityLabel }) => (
  <Pressable
    style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    onPress={onPress}
    accessible={true}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel || label}
  >
    <View style={styles.iconContainer}>
      <MaterialCommunityIcons name={icon} size={24} color="#1F2937" />
    </View>
    <Text style={styles.label}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingVertical: 8,
    marginLeft: 2,
  },
  pressed: {
    backgroundColor: '#E4E7EB',
  },
  iconContainer: {
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: '#1F2937',
    marginTop: 2,
  },
});