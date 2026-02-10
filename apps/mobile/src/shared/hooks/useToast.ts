import { Alert } from 'react-native';

type ToastArgs = {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

export function useToast() {
  return {
    toast: ({ title, description }: ToastArgs) => {
      Alert.alert(title, description ?? '');
    },
  };
}
