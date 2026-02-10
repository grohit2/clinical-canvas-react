import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { FormProvider } from 'react-hook-form';
import { router } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';

import { usePatientRegistrationForm } from '../hooks/usePatientRegistrationForm';
import { formStyles as s } from '../../../shared/ui/formStyles';

import { PatientIdentitySection } from '../sections/PatientIdentitySection';
import { RegistrationSection } from '../sections/RegistrationSection';
import { MedicalDetailsSection } from '../sections/MedicalDetailsSection';
import { FilesPrioritySection } from '../sections/FilesPrioritySection';
import { EmergencyContactSection } from '../sections/EmergencyContactSection';

const categories = [
  { id: 'patient-details', title: 'PD' },
  { id: 'registration', title: 'REG' },
  { id: 'medical-details', title: 'MD' },
  { id: 'files-priority', title: 'FILES' },
  { id: 'emergency-contact', title: 'EMER' },
] as const;

export function PatientRegistrationScreen({ patientId }: { patientId?: string }) {
  const { form, onSubmit, isLoading, isEditMode, patientQuery } =
    usePatientRegistrationForm(patientId);

  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const [activeSection, setActiveSection] =
    useState<(typeof categories)[number]['id']>('patient-details');

  const name = form.watch('name');
  const age = form.watch('age');
  const sex = form.watch('sex');
  const scheme = form.watch('scheme');
  const mrn = form.watch('mrn');
  const department = form.watch('department');
  const pathway = form.watch('pathway');

  const mandatoryComplete = useMemo(() => {
    return isEditMode
      ? Boolean(name?.trim() && age && sex)
      : Boolean(
          name?.trim() &&
            age &&
            sex &&
            scheme &&
            mrn?.trim() &&
            department?.trim() &&
            pathway
        );
  }, [age, department, isEditMode, mrn, name, pathway, scheme, sex]);

  const getSectionCompletionStatus = (sectionId: string) => {
    switch (sectionId) {
      case 'patient-details':
        return Boolean(name && age && sex);
      case 'registration':
        return Boolean(scheme && (isEditMode || mrn) && department);
      case 'medical-details':
        return Boolean(
          pathway || form.watch('diagnosis') || form.watch('assignedDoctor')
        );
      case 'files-priority':
        return Boolean(form.watch('filesUrl') || form.watch('isUrgent'));
      case 'emergency-contact':
        return Boolean(
          form.watch('emergencyContact.name') || form.watch('emergencyContact.phone')
        );
      default:
        return false;
    }
  };

  const scrollToSection = (id: string) => {
    const y = sectionOffsets.current[id] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

  if (isEditMode && patientQuery?.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isEditMode && patientQuery?.error) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}
      >
        <Text style={{ color: '#ef4444', fontWeight: '800' }}>
          Failed to load patient data
        </Text>
      </View>
    );
  }

  return (
    <FormProvider {...form}>
      <View style={s.screen}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.stepper}>
          {categories.map((cat) => {
            const active = activeSection === cat.id;
            const done = getSectionCompletionStatus(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => scrollToSection(cat.id)}
                style={[s.stepBtn, active ? s.stepBtnActive : s.stepBtnIdle]}
              >
                {done ? <Check size={12} color="#22c55e" /> : <View style={{ height: 12 }} />}
                <Text style={s.stepBtnText}>{cat.title}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.content}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            const ids = categories.map((c) => c.id);
            let current = ids[0];

            for (const id of ids) {
              const off = sectionOffsets.current[id];
              if (off !== undefined && off <= y + 120) current = id;
            }
            setActiveSection(current as (typeof categories)[number]['id']);
          }}
        >
          <View style={s.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ArrowLeft size={22} color="#4b5563" />
            </Pressable>
            <Text style={s.headerTitle}>{isEditMode ? 'Edit Patient' : 'Add New Patient'}</Text>
          </View>

          <View onLayout={(e) => (sectionOffsets.current['patient-details'] = e.nativeEvent.layout.y)}>
            <PatientIdentitySection />
          </View>

          <View onLayout={(e) => (sectionOffsets.current.registration = e.nativeEvent.layout.y)}>
            <RegistrationSection isEditMode={isEditMode} />
          </View>

          <View onLayout={(e) => (sectionOffsets.current['medical-details'] = e.nativeEvent.layout.y)}>
            <MedicalDetailsSection />
          </View>

          <View onLayout={(e) => (sectionOffsets.current['files-priority'] = e.nativeEvent.layout.y)}>
            <FilesPrioritySection />
          </View>

          <View
            onLayout={(e) =>
              (sectionOffsets.current['emergency-contact'] = e.nativeEvent.layout.y)
            }
          >
            <EmergencyContactSection />
          </View>
        </ScrollView>

        {mandatoryComplete && (
          <Pressable
            onPress={() => {
              void onSubmit();
            }}
            disabled={isLoading}
            style={[s.fab, isLoading ? { opacity: 0.7 } : null]}
          >
            <Check size={20} color="white" />
            <Text style={s.fabText}>
              {isLoading ? (isEditMode ? 'Updating...' : 'Adding...') : 'Done'}
            </Text>
          </Pressable>
        )}
      </View>
    </FormProvider>
  );
}
