import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

export function ScrubberBubble({
  label,
  opacity,
  y,
}: {
  label: string;
  opacity: SharedValue<number>;
  y: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const offsetY = interpolate(y.value, [0, 400], [0, 340], Extrapolation.CLAMP);
    return {
      opacity: opacity.value,
      transform: [{ translateY: offsetY }],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Animated.Text style={styles.text}>{label}</Animated.Text>
      <View style={styles.pointer} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 48,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  pointer: {
    position: 'absolute',
    right: -6,
    top: '50%',
    marginTop: -6,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#1e293b',
  },
});
