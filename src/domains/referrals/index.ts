// Screens
export { ReferralsScreen } from './screens/ReferralsScreen';

// Types
export type {
  ReferralStatus,
  ConsultStatus,
  Priority,
  Patient,
  ReferralItem,
  ConsultItem,
  ReferralOrConsult,
  ReferralStats,
  CurrentUser,
} from './core/types';

// Core utilities
export {
  isDelayed,
  isMyItem,
  isSent,
  isReceived,
  formatReferralDate,
  getStatusColor,
} from './core/types';
