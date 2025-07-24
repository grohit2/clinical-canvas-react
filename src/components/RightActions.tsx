import React from 'react';
import { View, StyleSheet, ToastAndroid, Platform } from 'react-native';
import * as Clipboard from '@react-native-clipboard/clipboard';
import * as Haptics from 'expo-haptics';
import { ActionButton } from './ui/ActionButton';

const LIS_URL = 'http://115.241.194.20/LIS/Reports/Patient_Report.aspx/';

export const RightActions = ({ mrn, close }) => {
  const openLink = (mrn) => {
    // TODO: Use WebView or Linking.openURL
    const url = `${LIS_URL}${mrn}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      // Use Linking.openURL(url)
    }
    close && close();
  };

  const copyMrn = (mrn) => {
    Clipboard.setString(mrn);
    if (Platform.OS === 'android') {
      ToastAndroid.show('MRN copied', ToastAndroid.SHORT);
    } else {
      // TODO: Use Snackbar or similar for iOS/web
    }
    Haptics.selectionAsync();
    close && close();
  };

  const openRadiology = (mrn) => {
    // Placeholder for future radiology link
    close && close();
  };

  return (
    <View style={styles.actionBar}>
      <ActionButton icon="flask" label="Labs" onPress={() => openLink(mrn)} />
      <ActionButton icon="content-copy" label="Copy" onPress={() => copyMrn(mrn)} />
      <ActionButton icon="image" label="Radio" onPress={() => openRadiology(mrn)} />
    </View>
  );
};

const styles = StyleSheet.create({
  actionBar: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
});