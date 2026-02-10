import { useEffect } from 'react';
import { router } from 'expo-router';

export default function LegacyAddPatientRoute() {
  useEffect(() => {
    router.replace('/patients/register' as never);
  }, []);

  return null;
}
