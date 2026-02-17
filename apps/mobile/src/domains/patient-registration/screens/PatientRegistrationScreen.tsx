import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ScrollView as RNScrollView,
  type LayoutChangeEvent,
} from 'react-native';
import { FormProvider } from 'react-hook-form';
import { router } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePatientRegistrationForm } from '../hooks/usePatientRegistrationForm';
import { formStyles as s } from '../../../shared/ui/formStyles';
import { REGISTRATION_LAYOUT } from '../constants';
import { RegistrationCategoryTabs } from '../components/RegistrationCategoryTabs';
import { useScrollSync } from '../hooks/useScrollSync';

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

type CategoryId = (typeof categories)[number]['id'];

export function PatientRegistrationScreen({ patientId }: { patientId?: string }) {
  const insets = useSafeAreaInsets();
  const { form, onSubmit, isLoading, isEditMode, patientQuery } =
    usePatientRegistrationForm(patientId);

  const scrollOffset =
    REGISTRATION_LAYOUT.tabBarHeight + REGISTRATION_LAYOUT.contentTopPadding;

  const {
    activeTabId,
    setScrollViewRef,
    registerSectionPosition,
    scrollToSection,
    handleScrollOffset,
    handleScrollEnd,
  } = useScrollSync({
    sections: categories,
    scrollOffset,
  });

  const name = form.watch('name');
  const age = form.watch('age');
  const sex = form.watch('sex');
  const scheme = form.watch('scheme');
  const mrn = form.watch('mrn');
  const department = form.watch('department');
  const pathway = form.watch('pathway');
  const diagnosis = form.watch('diagnosis');
  const assignedDoctor = form.watch('assignedDoctor');
  const filesUrl = form.watch('filesUrl');
  const isUrgent = form.watch('isUrgent');
  const emergencyContactName = form.watch('emergencyContact.name');
  const emergencyContactPhone = form.watch('emergencyContact.phone');

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

  const getSectionCompletionStatus = (sectionId: CategoryId) => {
    switch (sectionId) {
      case 'patient-details':
        return Boolean(name && age && sex);
      case 'registration':
        return Boolean(scheme && (isEditMode || mrn) && department);
      case 'medical-details':
        return Boolean(pathway || diagnosis || assignedDoctor);
      case 'files-priority':
        return Boolean(filesUrl || isUrgent);
      case 'emergency-contact':
        return Boolean(emergencyContactName || emergencyContactPhone);
      default:
        return false;
    }
  };

  const onScrollOffset = useCallback(
    (y: number) => {
      handleScrollOffset(y);
    },
    [handleScrollOffset]
  );

  const onScrollEnd = useCallback(() => {
    handleScrollEnd();
  }, [handleScrollEnd]);

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        runOnJS(onScrollOffset)(event.contentOffset.y);
      },
      onEndDrag: () => {
        runOnJS(onScrollEnd)();
      },
      onMomentumEnd: () => {
        runOnJS(onScrollEnd)();
      },
    },
    [onScrollOffset, onScrollEnd]
  );

  const handleSectionLayout = useCallback(
    (sectionId: CategoryId) => (event: LayoutChangeEvent) => {
      registerSectionPosition(sectionId, event.nativeEvent.layout.y);
    },
    [registerSectionPosition]
  );

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
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <Animated.ScrollView
          ref={(node) => {
            setScrollViewRef(node as unknown as RNScrollView | null);
          }}
          stickyHeaderIndices={[1]}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 140 + insets.bottom },
          ]}
        >
          <View style={styles.headerContainer}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <ArrowLeft size={22} color="#4b5563" />
              </Pressable>
              <Text style={styles.headerTitle}>
                {isEditMode ? 'Edit Patient' : 'Add Patient'}
              </Text>
            </View>
          </View>

          <View style={styles.stickyTabs}>
            <RegistrationCategoryTabs
              sections={categories.map((category) => ({
                ...category,
                done: getSectionCompletionStatus(category.id),
              }))}
              activeTabId={activeTabId}
              onTabPress={scrollToSection}
            />
          </View>

          <View
            style={[styles.sectionContainer, styles.firstSectionContainer]}
            onLayout={handleSectionLayout('patient-details')}
          >
            <PatientIdentitySection />
          </View>

          <View
            style={styles.sectionContainer}
            onLayout={handleSectionLayout('registration')}
          >
            <RegistrationSection isEditMode={isEditMode} />
          </View>

          <View
            style={styles.sectionContainer}
            onLayout={handleSectionLayout('medical-details')}
          >
            <MedicalDetailsSection />
          </View>

          <View
            style={styles.sectionContainer}
            onLayout={handleSectionLayout('files-priority')}
          >
            <FilesPrioritySection />
          </View>

          <View
            style={[styles.sectionContainer, styles.lastSectionContainer]}
            onLayout={handleSectionLayout('emergency-contact')}
          >
            <EmergencyContactSection />
          </View>
        </Animated.ScrollView>

        {mandatoryComplete && (
          <Pressable
            onPress={() => {
              void onSubmit();
            }}
            disabled={isLoading}
            style={[
              s.fab,
              { bottom: 22 + insets.bottom },
              isLoading ? { opacity: 0.7 } : null,
            ]}
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

const styles = StyleSheet.create({
  scrollContent: {
    backgroundColor: '#f9fafb',
  },
  headerContainer: {
    backgroundColor: '#f9fafb',
    paddingHorizontal: REGISTRATION_LAYOUT.contentHorizontalPadding,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerRow: {
    minHeight: REGISTRATION_LAYOUT.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginLeft: 10,
  },
  stickyTabs: {
    height: REGISTRATION_LAYOUT.tabBarHeight,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  sectionContainer: {
    paddingHorizontal: REGISTRATION_LAYOUT.contentHorizontalPadding,
    marginBottom: REGISTRATION_LAYOUT.gridGap,
  },
  firstSectionContainer: {
    paddingTop: REGISTRATION_LAYOUT.contentTopPadding,
  },
  lastSectionContainer: {
    marginBottom: 0,
  },
});
