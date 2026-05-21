import React from 'react';
import { Calendar, ChevronLeft } from 'lucide-react';
import { formatDayLabel, isDayDrillDown } from '../../utils/vitalDateRange';

export default function DayDrillDownBanner({ dateRange, onBack, darkMode, accentClass = 'text-violet-600 dark:text-violet-400' }) {
  if (!isDayDrillDown(dateRange)) return null;

  const periodLabel = dateRange.parentPeriod === 'month' ? '30 days' : '7 days';

  return (
    <div
      className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
        darkMode ? 'border-slate-600/50 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className={`flex items-center gap-2 font-medium ${accentClass}`}>
        <Calendar className="h-4 w-4 shrink-0" />
        <span>Viewing {formatDayLabel(dateRange.date)}</span>
      </div>
      <button
        type="button"
        onClick={onBack}
        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
          darkMode
            ? 'text-slate-300 hover:bg-slate-700/60'
            : 'text-gray-600 hover:bg-gray-200'
        }`}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {periodLabel}
      </button>
    </div>
  );
}
