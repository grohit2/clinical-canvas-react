import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, Images } from 'lucide-react-native';

export function PhotoUploader({
  onCamera,
  onGallery,
}: {
  onCamera: () => void;
  onGallery: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable style={[styles.button, styles.primary]} onPress={onCamera}>
        <Camera size={18} color="#ffffff" />
        <Text style={styles.primaryText}>Geo Camera</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.secondary]} onPress={onGallery}>
        <Images size={18} color="#334155" />
        <Text style={styles.secondaryText}>Gallery</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primary: {
    backgroundColor: '#2563eb',
  },
  secondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryText: {
    color: '#334155',
    fontWeight: '700',
  },
});
