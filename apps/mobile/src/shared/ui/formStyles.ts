import { StyleSheet } from 'react-native';

export const formStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 140 },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginLeft: 10 },

  section: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    marginBottom: 0,
  },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  sectionSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  label: { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 6 },
  required: { color: '#ef4444' },

  row: { flexDirection: 'row' },
  colLeft: { flex: 1, marginRight: 12 },
  col: { flex: 1 },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: 'white',
    color: '#111827',
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },

  error: { fontSize: 12, color: '#ef4444', marginTop: 6 },
  helper: { fontSize: 12, color: '#6b7280', marginTop: 8 },

  stepper: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stepBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
  },
  stepBtnActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  stepBtnIdle: { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' },
  stepBtnText: { fontSize: 11, fontWeight: '900', color: '#374151' },

  fab: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: { color: 'white', fontWeight: '900', marginLeft: 10 },
});
