import { StyleSheet } from 'react-native';

/**
 * Tab-bar base height (before safe-area inset is added).
 * Matches TAB_BAR_BASE_HEIGHT in src/navigation/tabBarStyle.ts.
 */
export const TAB_BAR_BASE_HEIGHT = 52;

/** Minimum bottom padding the tab bar applies (mirrors tabBarStyle.ts). */
export const TAB_BAR_MIN_BOTTOM_PADDING = 8;

/** Gap between the FAB and the element below it (tab bar or screen edge). */
export const FAB_MARGIN_BOTTOM = 16;

/** Standard FAB diameter (Material Design default). */
export const FAB_SIZE = 56;

/**
 * Compute the `bottom` value for a FAB that sits above the tab bar.
 *
 * total tab-bar height = TAB_BAR_BASE_HEIGHT + max(bottomInset, MIN_PADDING)
 * fab bottom           = total tab-bar height + FAB_MARGIN_BOTTOM
 */
export function getFabBottom(bottomInset: number): number {
  const safeBottomPadding = Math.max(bottomInset, TAB_BAR_MIN_BOTTOM_PADDING);
  return TAB_BAR_BASE_HEIGHT + safeBottomPadding + FAB_MARGIN_BOTTOM;
}

/** Standard FAB styles shared across screens (color excluded -- set per screen). */
export const fabBaseStyle = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
