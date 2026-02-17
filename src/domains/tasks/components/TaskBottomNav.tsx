import type { ReactNode } from 'react';
import type { TaskBoardTab } from '../board/types';

export interface TaskNavTab {
  id: TaskBoardTab;
  label: string;
  icon: ReactNode;
  badge?: number;
  dot?: boolean;
  enabled?: boolean;
}

export interface TaskBottomNavProps {
  tabs: TaskNavTab[];
  activeTab: TaskBoardTab;
  onTabChange: (tab: TaskBoardTab) => void;
}

export function TaskBottomNav(props: TaskBottomNavProps) {
  const { tabs, activeTab, onTabChange } = props;
  const enabledTabs = tabs.filter((tab) => tab.enabled !== false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-2 pb-[calc(7px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_24px_rgba(16,24,40,0.08)]">
      <div
        className="mx-auto grid max-w-[760px] gap-1"
        style={{ gridTemplateColumns: `repeat(${enabledTabs.length}, minmax(0, 1fr))` }}
      >
        {enabledTabs.map((tab) => {
          const active = activeTab === tab.id;
          const hasBadge = tab.badge !== undefined && tab.badge !== null && tab.badge !== false;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              title={tab.label}
              className={`flex min-h-[46px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-xs font-semibold ${
                active ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="relative text-base leading-none">
                {tab.icon}
                {hasBadge ? (
                  <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                    {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : String(tab.badge)}
                  </span>
                ) : null}
                {!hasBadge && tab.dot ? (
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-rose-600" />
                ) : null}
              </span>
              <span className={active ? 'font-bold' : ''}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default TaskBottomNav;
