import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

type CaptureParams = {
  imageUri: string;
  stampText: string;
  targetWidth?: number;
  quality?: number;
};

export type GeoStampCaptureHandle = {
  captureStampedImage: (params: CaptureParams) => Promise<string>;
};

export const GeoStampCapture = forwardRef<GeoStampCaptureHandle>((_, ref) => {
  const captureViewRef = useRef<View | null>(null);
  const [state, setState] = useState<{
    uri: string;
    stamp: string;
    width: number;
    height: number;
    quality: number;
  } | null>(null);

  const imageLoadedRef = useRef(false);
  const imageReadyResolverRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    async captureStampedImage({
      imageUri,
      stampText,
      targetWidth = 1600,
      quality = 0.92,
    }) {
      const dimensions = await new Promise<{ width: number; height: number }>(
        (resolve, reject) => {
          Image.getSize(
            imageUri,
            (width, height) => resolve({ width, height }),
            (error) => reject(error)
          );
        }
      );

      const ratio = dimensions.height / dimensions.width;
      const width = targetWidth;
      const height = Math.max(1, Math.round(targetWidth * ratio));

      imageLoadedRef.current = false;
      setState({
        uri: imageUri,
        stamp: stampText,
        width,
        height,
        quality,
      });

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => setTimeout(resolve, 60));

      if (!imageLoadedRef.current) {
        await new Promise<void>((resolve) => {
          imageReadyResolverRef.current = resolve;
        });
      }

      if (!captureViewRef.current) {
        setState(null);
        throw new Error('GeoStampCapture view is not ready');
      }

      const outputUri = await captureRef(captureViewRef, {
        format: 'jpg',
        quality,
        result: 'tmpfile',
        width,
        height,
      });

      setState(null);
      return outputUri;
    },
  }));

  if (!state) return null;

  return (
    <View style={styles.offscreen} pointerEvents="none">
      <View
        ref={captureViewRef}
        collapsable={false}
        style={{ width: state.width, height: state.height, backgroundColor: '#000000' }}
      >
        <Image
          source={{ uri: state.uri }}
          style={{ width: state.width, height: state.height }}
          resizeMode="cover"
          onLoadEnd={() => {
            imageLoadedRef.current = true;
            imageReadyResolverRef.current?.();
            imageReadyResolverRef.current = null;
          }}
        />
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>{state.stamp}</Text>
        </View>
      </View>
    </View>
  );
});

GeoStampCapture.displayName = 'GeoStampCapture';

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -10000,
    top: -10000,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(15,23,42,0.30)',
  },
  overlayText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
