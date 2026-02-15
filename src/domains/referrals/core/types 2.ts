// Referrals types - Pure TypeScript, no React/RN imports

export type ReferralStatus = 'Initiated' | 'Accepted' | 'Completed' | 'Closed';
export type ConsultStatus = 'Requested' | 'Accepted' | 'Completed';
export type Priority = 'Normal' | 'Urgent';

export interface Patient {
  id: string;
  name: string;
  uid?: string;
}

export interface ReferralItem {
  type: 'referral';
  id: string;
  patient: Patient;
  referring_provider: string;
  referred_to_provider: string;
  status: ReferralStatus;
  priority: Priority;
  reason?: string;
  created_at: string;
  updated_at?: string;
  appointment_at?: string;
  expected_response_by?: string;
  completed_at?: string;
}

export interface ConsultItem {
  type: 'consult';
  id: string;
  patient: Patient;
  from_department: string;
  to_department: string;
  requested_by: string;
  consulting_doctor: string | null;
  status: ConsultStatus;
  priority: Priority;
  reason?: string;
  created_at: string;
  updated_at?: string;
  scheduled_at?: string;
  expected_response_by?: string;
  completed_at?: string;
}

export type ReferralOrConsult = ReferralItem | ConsultItem;

export interface ReferralStats {
  total: number;
  urgent: number;
  delayed: number;
}

export interface CurrentUser {
  name: string;
  department: string;
}

// Helper: Check if item is delayed (>24h without response)
export function isDelayed(item: ReferralOrConsult): boolean {
  const now = new Date();
  const created = new Date(item.created_at);
  const hoursElapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  if (item.expected_response_by) {
    const expected = new Date(item.expected_response_by);
    return now > expected && hoursElapsed > 24;
  }

  const incompleteStatuses: string[] = ['Initiated', 'Requested', 'Accepted'];
  return incompleteStatuses.includes(item.status) && hoursElapsed >= 24;
}

// Helper: Check if item belongs to current user
export function isMyItem(item: ReferralOrConsult, user: CurrentUser): boolean {
  if (item.type === 'referral') {
    return (
      item.referring_provider.includes(user.name) ||
      item.referred_to_provider.includes(user.name)
    );
  } else {
    return (
      item.requested_by.includes(user.name) ||
      item.consulting_doctor?.includes(user.name) ||
      item.to_department === user.department ||
      item.from_department === user.department
    );
  }
}

// Helper: Check if user sent this item
export function isSent(item: ReferralOrConsult, user: CurrentUser): boolean {
  if (item.type === 'referral') {
    return item.referring_provider.includes(user.name);
  } else {
    return (
      item.requested_by.includes(user.name) ||
      item.from_department === user.department
    );
  }
}

// Helper: Check if user received this item
export function isReceived(item: ReferralOrConsult, user: CurrentUser): boolean {
  if (item.type === 'referral') {
    return item.referred_to_provider.includes(user.name);
  } else {
    return (
      item.consulting_doctor?.includes(user.name) ||
      item.to_department === user.department
    );
  }
}

// Helper: Format date for display
export function formatReferralDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Helper: Get status badge color
export function getStatusColor(status: string): string {
  switch (status) {
    case 'Completed':
    case 'Closed':
      return 'bg-green-100 text-green-800';
    case 'Accepted':
      return 'bg-blue-100 text-blue-800';
    case 'Initiated':
    case 'Requested':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
