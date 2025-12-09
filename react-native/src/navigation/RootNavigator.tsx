import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PatientListScreen, PatientDetailScreen } from '../screens';
import { RootStackParamList, ScreenNames } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={ScreenNames.PatientList}
        screenOptions={{
          headerShown: false, // Using custom headers
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: '#F3F4F6',
          },
        }}
      >
        <Stack.Screen
          name={ScreenNames.PatientList}
          component={PatientListScreen}
          options={{
            title: 'Patients',
          }}
        />
        <Stack.Screen
          name={ScreenNames.PatientDetail}
          component={PatientDetailScreen}
          options={{
            title: 'Patient Detail',
          }}
        />
        {/*
          Additional screens can be added here:
          - AddPatient
          - EditPatient
          - PatientDocuments
          - PatientWorkflow
          - PatientNotes

          These are referenced but not implemented in this patient-focused module.
          Implement these screens as needed.
        */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
