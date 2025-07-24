import React, { useRef } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const ACTION_WIDTH = 72;

export const SwipeableRow = ({
  children,
  renderRightActions,
  onSwipeableOpen,
  onSwipeableClose,
  ...props
}) => {
  const swipeableRef = useRef(null);

  const handleSwipeableOpen = () => {
    Haptics.selectionAsync();
    onSwipeableOpen && onSwipeableOpen();
  };

  const handleSwipeableClose = () => {
    onSwipeableClose && onSwipeableClose();
  };

  return (
    <GestureHandlerRootView>
      <Swipeable
        ref={swipeableRef}
        friction={2}
        overshootRight={false}
        renderRightActions={renderRightActions}
        rightThreshold={ACTION_WIDTH / 2}
        onSwipeableOpen={handleSwipeableOpen}
        onSwipeableClose={handleSwipeableClose}
        {...props}
      >
        <Pressable
          style={{ flex: 1 }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Swipeable row"
        >
          {children}
        </Pressable>
      </Swipeable>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  // Add styles if needed
});