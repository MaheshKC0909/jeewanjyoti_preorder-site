import React, { useState } from 'react';
import {
  Pill,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Loader2,
  PackageOpen,
} from 'lucide-react';
import { toggleMedicationStatus } from '../../services/medicationApi';

const today = new Date().toISOString().split('T')[0];

const MedicationList = ({ darkMode, medications, loading, onRefresh }) => {
  const [togglingId, setTogglingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = async (med) => {
    setTogglingId(med.id);
    try {
      await toggleMedicationStatus(med.id, !med.medication_status);
      showToast('success', `Status updated for ${med.name}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast('error', 'Failed to update status.');
    } finally {
      setTogglingId(null);
    }
  };

  const isExpired = (endDate) => endDate && endDate < today;

  const sorted = [...(medications || [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const cardBase = `rounded-2xl border p-4 transition-all duration-200 hover:shadow-md ${
    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
  }`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Loading medications...
        </p>
      </div>
    );
  }

  if (!sorted || sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <PackageOpen className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
        </div>
        <div className="text-center">
          <p className={`text-base font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            No medications found
          </p>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Add your first medication using the form above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all duration-300 ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((med) => {
          const expired = isExpired(med.end_date);
          const active = med.medication_status;

          return (
            <div
              key={med.id}
              className={`${cardBase} ${
                expired
                  ? darkMode
                    ? 'border-red-800/50 bg-red-950/20'
                    : 'border-red-200 bg-red-50/40'
                  : ''
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      expired
                        ? 'bg-red-100 text-red-500'
                        : active
                        ? 'bg-violet-100 text-violet-600'
                        : darkMode
                        ? 'bg-gray-600 text-gray-400'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Pill className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4
                      className={`font-bold text-sm truncate ${
                        darkMode ? 'text-white' : 'text-gray-800'
                      }`}
                    >
                      {med.name}
                    </h4>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {med.dosage}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  {expired ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-100 px-2 py-1 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> Expired
                    </span>
                  ) : active ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 mb-3">
                <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{med.frequency}</span>
                </div>
                <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {med.start_date} → {med.end_date}
                  </span>
                </div>
                {med.skip_date && (
                  <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-yellow-500' : 'text-yellow-600'}`}>
                    <span className="text-[10px] uppercase font-semibold tracking-wide">Skip:</span>
                    <span>{med.skip_date}</span>
                  </div>
                )}
              </div>

              {/* Toggle */}
              <div className="flex justify-end pt-2 border-t border-dashed border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => handleToggle(med)}
                  disabled={togglingId === med.id}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
                    active
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : darkMode
                      ? 'text-gray-400 hover:bg-gray-600'
                      : 'text-gray-500 hover:bg-gray-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Toggle status"
                >
                  {togglingId === med.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : active ? (
                    <ToggleRight className="w-4 h-4" />
                  ) : (
                    <ToggleLeft className="w-4 h-4" />
                  )}
                  {active ? 'Mark Inactive' : 'Mark Active'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MedicationList;
