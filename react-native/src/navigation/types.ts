// Navigation type definitions for React Native app

export type RootStackParamList = {
  PatientList: undefined;
  PatientDetail: {
    patientId: string;
  };
  AddPatient: undefined;
  EditPatient: {
    patientId: string;
  };
  PatientDocuments: {
    patientId: string;
  };
  PatientWorkflow: {
    patientId: string;
  };
  PatientNotes: {
    patientId: string;
  };
};

// Screen names enum for type safety
export const ScreenNames = {
  PatientList: 'PatientList',
  PatientDetail: 'PatientDetail',
  AddPatient: 'AddPatient',
  EditPatient: 'EditPatient',
  PatientDocuments: 'PatientDocuments',
  PatientWorkflow: 'PatientWorkflow',
  PatientNotes: 'PatientNotes',
} as const;

export type ScreenName = keyof typeof ScreenNames;
