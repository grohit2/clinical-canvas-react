import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  CalendarClock,
  Clock3,
  Building2,
  Activity,
  ChevronRight,
} from 'lucide-react-native';
import { usePatients } from '../../src/hooks/usePatients';
import { getStageVariant } from '@clinical-canvas/core';
import type { Patient } from '@clinical-canvas/core';

type ScheduleTab = 'ongoing' | 'upcoming' | 'completed';

interface ScheduleItem {
  id: string;
  name: string;
  summary: string;
  status: ScheduleTab;
  timeRange: string;
  relativeLabel: string;
  accentColor: string;
}

const TAB_LABELS: Record<ScheduleTab, string> = {
  ongoing: 'Ongoing',
  upcoming: 'Upcoming',
  completed: 'Completed',
};

const STATUS_FALLBACK: ScheduleTab[] = [
  'ongoing',
  'ongoing',
  'upcoming',
  'upcoming',
  'completed',
  'completed',
];

const SLOT_FALLBACK = [
  '9:30 AM - 10:00 AM',
  '10:00 AM - 10:30 AM',
  '10:30 AM - 11:00 AM',
  '11:00 AM - 11:30 AM',
  '11:30 AM - 12:00 PM',
  '1:00 PM - 1:30 PM',
];

const STAGE_ACCENT_COLOR: Record<string, string> = {
  default: '#3b82f6',
  urgent: '#ef4444',
  caution: '#f59e0b',
  stable: '#22c55e',
};

function formatTimeRange(start: Date) {
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function getRelativeLabel(start: Date, now: Date) {
  const deltaMinutes = Math.round((start.getTime() - now.getTime()) / 60000);
  if (deltaMinutes <= -40) {
    return `${Math.abs(deltaMinutes)}m ago`;
  }
  if (deltaMinutes < 0) {
    return 'In progress';
  }
  if (deltaMinutes < 60) {
    return `${deltaMinutes}m more`;
  }
  const hours = Math.floor(deltaMinutes / 60);
  const minutes = deltaMinutes % 60;
  return minutes === 0 ? `${hours}h more` : `${hours}h ${minutes}m more`;
}

function getSlotStatus(start: Date, now: Date): ScheduleTab {
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  if (now >= start && now <= end) {
    return 'ongoing';
  }
  if (start > now) {
    return 'upcoming';
  }
  return 'completed';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { data: patients = [], isLoading } = usePatients();
  const [activeTab, setActiveTab] = useState<ScheduleTab>('ongoing');
  const patientList = patients as Patient[];

  const scheduleItems = useMemo(() => {
    const now = new Date();

    if (!patientList.length) {
      return SLOT_FALLBACK.map((slot, index) => ({
        id: `demo-${index}`,
        name: ['Emily Chen', 'Michael Smith', 'Jessica Lee', 'David Kim', 'Sarah Brown', 'James Wilson'][index],
        summary: ['Initial Consultation', 'Routine Checkup', 'Follow-up', 'Consultation', 'Follow-up', 'Review'][index],
        status: STATUS_FALLBACK[index],
        timeRange: slot,
        relativeLabel: ['10m more', '40m more', '1h more', '1h 30m more', '2h more', '2h 30m more'][index],
        accentColor: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444'][index],
      }));
    }

    return patientList.slice(0, 8).map((patient, index) => {
      const fallbackStart = new Date(now);
      fallbackStart.setHours(9 + Math.floor(index / 2), index % 2 === 0 ? 30 : 0, 0, 0);
      const surgeryDate = patient.surgeryDate ? new Date(patient.surgeryDate) : null;
      const hasValidSurgeryDate = surgeryDate && !Number.isNaN(surgeryDate.getTime());
      const start = hasValidSurgeryDate ? surgeryDate : fallbackStart;
      const variant = getStageVariant(patient.currentState || '');
      return {
        id: patient.id,
        name: patient.name,
        summary: `${patient.procedureName || patient.diagnosis || 'Consultation'}${patient.scheme ? ` · ${patient.scheme}` : ''}`,
        status: hasValidSurgeryDate
          ? getSlotStatus(start, now)
          : STATUS_FALLBACK[index % STATUS_FALLBACK.length],
        timeRange: hasValidSurgeryDate ? formatTimeRange(start) : SLOT_FALLBACK[index % SLOT_FALLBACK.length],
        relativeLabel: getRelativeLabel(start, now),
        accentColor: STAGE_ACCENT_COLOR[variant] || STAGE_ACCENT_COLOR.default,
      } satisfies ScheduleItem;
    });
  }, [patientList]);

  const quickCards = useMemo(() => {
    const nextNow = scheduleItems.find((item) => item.status === 'ongoing') ?? scheduleItems[0];
    const waiting = scheduleItems.find((item) => item.status === 'upcoming') ?? scheduleItems[1] ?? scheduleItems[0];

    return [
      {
        title: nextNow?.name || 'No active consult',
        subtitle: nextNow ? `${nextNow.summary} · ${nextNow.relativeLabel}` : 'Current schedule will appear here',
        icon: Clock3,
        onPress: () =>
          nextNow &&
          (nextNow.id.startsWith('demo-')
            ? router.push('/patients')
            : router.push(`/patients/${nextNow.id}` as never)),
      },
      {
        title: 'Waiting Room',
        subtitle: waiting ? `${waiting.name} · ${waiting.timeRange}` : 'No patients waiting',
        icon: Building2,
        onPress: () => router.push('/patients'),
      },
    ];
  }, [router, scheduleItems]);

  const filteredSchedule = useMemo(
    () => scheduleItems.filter((item) => item.status === activeTab),
    [activeTab, scheduleItems],
  );

  const stats = useMemo(() => {
    const totalPatients = patientList.length;
    const urgentPatients = patientList.filter((patient) => patient.isUrgent).length;
    const onsitePatients = patientList.filter((patient) => Boolean(patient.roomNumber)).length;
    const onlinePatients = Math.max(totalPatients - onsitePatients, 0);

    return {
      totalPatients,
      urgentPatients,
      onlinePatients,
      onsitePatients,
    };
  }, [patientList]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hi, Dr. Lisa!</Text>
            <Text style={styles.greetingSubtext}>Ready for today&apos;s patients?</Text>
          </View>
          <Pressable style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Notifications">
            <Bell size={18} color="#475569" />
          </Pressable>
        </View>

        <View style={styles.quickCardGrid}>
          {quickCards.map((card) => {
            const Icon = card.icon;
            return (
              <Pressable key={card.title} style={styles.quickCard} onPress={card.onPress}>
                <View style={styles.quickIconWrap}>
                  <Icon size={14} color="#2563eb" />
                </View>
                <View style={styles.quickContent}>
                  <Text style={styles.quickTitle} numberOfLines={1}>
                    {card.title}
                  </Text>
                  <Text style={styles.quickSubtitle} numberOfLines={2}>
                    {card.subtitle}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
          <Pressable onPress={() => router.push('/patients')} accessibilityRole="button">
            <Text style={styles.linkText}>See All</Text>
          </Pressable>
        </View>

        <View style={styles.segmentedControl}>
          {(Object.keys(TAB_LABELS) as ScheduleTab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.segmentButton, activeTab === tab && styles.segmentButtonActive]}
              accessibilityRole="button"
            >
              <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>
                {TAB_LABELS[tab]}
              </Text>
            </Pressable>
          ))}
        </View>

        {filteredSchedule.length ? (
          <View style={styles.scheduleList}>
            {filteredSchedule.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  item.id.startsWith('demo-')
                    ? router.push('/patients')
                    : router.push(`/patients/${item.id}` as never)
                }
                style={styles.scheduleCard}
              >
                <View style={[styles.scheduleAccent, { backgroundColor: item.accentColor }]} />
                <View style={styles.scheduleBody}>
                  <View style={styles.scheduleTopRow}>
                    <View style={styles.scheduleTimeWrap}>
                      <CalendarClock size={12} color="#64748b" />
                      <Text style={styles.scheduleTime}>{item.timeRange}</Text>
                    </View>
                    <Text style={styles.scheduleEta}>{item.relativeLabel}</Text>
                  </View>
                  <Text style={styles.scheduleName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.scheduleSummary} numberOfLines={1}>
                    {item.summary}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No items in this schedule tab.</Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Statistic</Text>
          <Pressable onPress={() => router.push('/patients')} accessibilityRole="button" style={styles.viewDetail}>
            <Text style={styles.linkText}>View Detail</Text>
            <ChevronRight size={14} color="#3b82f6" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <Pressable style={styles.statCard} onPress={() => router.push('/patients')}>
            <View style={styles.statIconWrap}>
              <Activity size={14} color="#2563eb" />
            </View>
            <Text style={styles.statLabel}>Patients Today</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{isLoading ? '...' : stats.totalPatients}</Text>
              <Text style={styles.statDelta}>+12%</Text>
            </View>
            <Text style={styles.statMeta}>From last week</Text>
          </Pressable>

          <Pressable style={styles.statCard} onPress={() => router.push('/patients')}>
            <View style={styles.statIconWrap}>
              <Clock3 size={14} color="#2563eb" />
            </View>
            <Text style={styles.statLabel}>Online/Onsite</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>
                {isLoading ? '...' : `${stats.onlinePatients}/${stats.onsitePatients}`}
              </Text>
              <Text style={styles.statDelta}>+10%</Text>
            </View>
            <Text style={styles.statMeta}>
              {isLoading ? 'Loading...' : `${stats.urgentPatients} urgent`}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e9edf2',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    paddingTop: 8,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '700',
    color: '#0f172a',
  },
  greetingSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
  },
  headerAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe5f1',
  },
  quickCardGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe5f1',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  quickIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  quickContent: {
    flex: 1,
  },
  quickTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#111827',
  },
  quickSubtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    color: '#64748b',
  },
  sectionHeader: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  linkText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  segmentedControl: {
    marginTop: 2,
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#2563eb',
  },
  segmentText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#f8fafc',
  },
  scheduleList: {
    gap: 8,
  },
  scheduleCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe5f1',
    paddingVertical: 10,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  scheduleAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  scheduleBody: {
    marginLeft: 6,
    gap: 4,
  },
  scheduleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleTime: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  scheduleEta: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  scheduleSummary: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe5f1',
    padding: 14,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
  },
  viewDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe5f1',
    padding: 10,
    gap: 4,
  },
  statIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  statDelta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  statMeta: {
    fontSize: 11,
    color: '#64748b',
  },
});
