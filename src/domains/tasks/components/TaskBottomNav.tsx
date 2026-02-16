import { Bell, ClipboardList, Eye, FileText, Home, Undo2 } from 'lucide-react';
import type { TaskBoardTab } from '../board/types';

export interface TaskBottomNavProps {
  activeTab: TaskBoardTab;
  onTabChange: (tab: TaskBoardTab) => void;
  onBack: () => void;
  onToggleView: () => void;
  showViewPanel: boolean;
}

function navButtonClass(active: boolean): string {
  return active
    ? 'bg-blue-100 text-blue-700'
    : 'text-slate-600 hover:bg-slate-100';
}

export function TaskBottomNav(props: TaskBottomNavProps) {
  const { activeTab, onTabChange, onBack, onToggleView, showViewPanel } = props;

  return (
    <div className="fixed bottom-3 left-1/2 z-50 w-[min(900px,calc(100%-16px))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-lg">
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <span className="inline-flex items-center gap-1">
              <Undo2 className="h-4 w-4" /> Back
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('home')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${navButtonClass(activeTab === 'home')}`}
          >
            <span className="inline-flex items-center gap-1">
              <Home className="h-4 w-4" /> Home
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('board')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${navButtonClass(activeTab === 'board')}`}
          >
            <span className="inline-flex items-center gap-1">
              <ClipboardList className="h-4 w-4" /> Board
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onTabChange('reminders')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${navButtonClass(activeTab === 'reminders')}`}
          >
            <span className="inline-flex items-center gap-1">
              <Bell className="h-4 w-4" /> Reminders
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('audit')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${navButtonClass(activeTab === 'audit')}`}
          >
            <span className="inline-flex items-center gap-1">
              <FileText className="h-4 w-4" /> Audit
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleView}
          className="absolute left-1/2 top-[-36px] h-16 w-16 -translate-x-1/2 rounded-full bg-blue-600 text-white shadow-lg"
          aria-pressed={showViewPanel}
        >
          <span className="flex h-full flex-col items-center justify-center text-[11px] font-bold">
            <Eye className="mb-0.5 h-4 w-4" /> View
          </span>
        </button>
      </div>
    </div>
  );
}

export default TaskBottomNav;
