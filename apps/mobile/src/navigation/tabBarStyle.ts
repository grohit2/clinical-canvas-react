import type { ViewStyle } from 'react-native';

const TAB_BAR_MIN_BOTTOM_PADDING = 8;
const TAB_BAR_BASE_HEIGHT = 52;

export function getTabBarVisibleStyle(bottomInset: number): ViewStyle {
  const safeBottomPadding = Math.max(bottomInset, TAB_BAR_MIN_BOTTOM_PADDING);

  return {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    paddingBottom: safeBottomPadding,
    height: TAB_BAR_BASE_HEIGHT + safeBottomPadding,
  };
}

export const TAB_BAR_HIDDEN_STYLE: ViewStyle = {
  display: 'none',
};
