import { useCallback } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionItem {
  id: string;
  label: string;
  abbr: string;
  /** Whether this action has an active/implemented screen */
  active?: boolean;
}

interface ActionSection {
  title: string;
  items: ActionItem[];
}

export interface PatientActionsSheetProps {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onAction: (actionId: string, patientId: string) => void;
}

// ---------------------------------------------------------------------------
// Data — matches the reference screenshots exactly
// ---------------------------------------------------------------------------

const SECTIONS: ActionSection[] = [
  {
    title: 'ORDERS & REQUESTS',
    items: [
      { id: 'investigation-order', label: 'Investigation\nOrder', abbr: 'IO' },
      { id: 'medication-order', label: 'Medication\nOrder', abbr: 'MO', active: true },
      { id: 'cross-consultation', label: 'Cross\nConsultation', abbr: 'CC' },
    ],
  },
  {
    title: 'NOTES & DOCUMENTS',
    items: [
      { id: 'progress-notes', label: 'Progress\nNotes', abbr: 'PN', active: true },
      { id: 'discharge-summary', label: 'Discharge\nSummary', abbr: 'DS', active: true },
      { id: 'initial-assessment', label: 'Initial\nAssessment', abbr: 'IA' },
      { id: 'risk-scorecard', label: 'Risk\nScorecard', abbr: 'RS' },
      { id: 'discharge-intimation', label: 'Discharge\nIntimation', abbr: 'DI' },
      { id: 'family-communication', label: 'Family\nCommunication', abbr: 'FC' },
      { id: 'ot-notes', label: 'OT Notes', abbr: 'OT' },
      { id: 'pac', label: 'PAC\n(Pre-Anesthesia)', abbr: 'PA' },
    ],
  },
  {
    title: 'RECORDS & RESULTS',
    items: [
      { id: 'results', label: 'Results', abbr: 'RE' },
      { id: 'past-records', label: 'Past Records', abbr: 'PR' },
    ],
  },
  {
    title: 'MONITORING',
    items: [
      { id: 'vital-trends', label: 'Vital Trends', abbr: 'VT' },
      { id: 'checklist', label: 'Checklist', abbr: 'CH' },
      { id: 'live-monitoring', label: 'Live\nMonitoring', abbr: 'LM' },
    ],
  },
  {
    title: 'OTHER',
    items: [
      { id: 'tasks', label: 'Tasks', abbr: 'TA', active: true },
      { id: 'incident-reporting', label: 'Incident\nReporting', abbr: 'IR' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ActionCard({
  item,
  cardWidth,
  onPress,
}: {
  item: ActionItem;
  cardWidth: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { width: cardWidth },
        item.active ? styles.cardActive : undefined,
        pressed ? styles.cardPressed : undefined,
      ]}
      onPress={onPress}
    >
      <View style={[styles.badge, item.active ? styles.badgeActive : undefined]}>
        <Text style={[styles.badgeText, item.active ? styles.badgeTextActive : undefined]}>
          {item.abbr}
        </Text>
      </View>
      <Text
        style={[styles.cardLabel, item.active ? styles.cardLabelActive : undefined]}
        numberOfLines={2}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function SectionBlock({
  section,
  cardWidth,
  onAction,
}: {
  section: ActionSection;
  cardWidth: number;
  onAction: (id: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.grid}>
        {section.items.map((item) => (
          <ActionCard
            key={item.id}
            item={item}
            cardWidth={cardWidth}
            onPress={() => onAction(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PatientActionsSheet({
  visible,
  patientId,
  onClose,
  onAction,
}: PatientActionsSheetProps) {
  const { width: screenWidth } = useWindowDimensions();
  // 4 columns with gaps: totalPadding(20*2) + gaps(10*3) = 70, remaining / 4
  const cardWidth = Math.floor((screenWidth - 40 - 30) / 4);

  const handleAction = useCallback(
    (actionId: string) => {
      onAction(actionId, patientId);
    },
    [onAction, patientId],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Sheet */}
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Patient Actions</Text>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces
          >
            {SECTIONS.map((section) => (
              <SectionBlock
                key={section.title}
                section={section}
                cardWidth={cardWidth}
                onAction={handleAction}
              />
            ))}
          </ScrollView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles — matches reference screenshots
// ---------------------------------------------------------------------------

const CARD_GAP = 10;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  /* Sheet */
  sheet: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 24,
  },

  /* Handle */
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },

  /* Title */
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },

  /* Scroll */
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  /* Section */
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },

  /* Card — default (inactive) */
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
    minHeight: 90,
  },
  /* Card — active (has implemented screen) */
  cardActive: {
    borderColor: '#c7d2fe',
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  cardPressed: {
    backgroundColor: '#f0efff',
  },

  /* Badge — default */
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f0f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  /* Badge — active */
  badgeActive: {
    backgroundColor: '#e0e0ff',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a5a3c9',
  },
  badgeTextActive: {
    color: '#6366f1',
  },

  /* Label */
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    lineHeight: 15,
  },
  cardLabelActive: {
    color: '#334155',
    fontWeight: '600',
  },
});

export default PatientActionsSheet;
