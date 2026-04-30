import React, { useState, useEffect, useCallback } from 'react';
import { Pill, Plus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import MedicationForm from '../components/medication/MedicationForm';
import MedicationList from '../components/medication/MedicationList';
import { getMedications } from '../services/medicationApi';

/**
 * MedicationPage
 *
 * Embeds an add-medication form (collapsible) + the medication list.
 * Accepts darkMode and userId as props so it fits seamlessly into the
 * existing dashboard Profile page.
 */
const MedicationPage = ({ darkMode, userId }) => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Resolve user ID from props or localStorage
  const resolvedUserId = userId || (() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      return userData.id || null;
    } catch {
      return null;
    }
  })();

  const fetchMedications = useCallback(async () => {
    if (!resolvedUserId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMedications(resolvedUserId);
      // Handle paginated or flat response
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];
      setMedications(list);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to load medications.'
      );
    } finally {
      setLoading(false);
    }
  }, [resolvedUserId]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchMedications();
  };

  const cardBg = darkMode
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-100';

  return (
    <div className={`rounded-2xl border shadow-lg ${cardBg}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Pill className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Medications
            </h3>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {medications.length} record{medications.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={fetchMedications}
            disabled={loading}
            className={`p-2 rounded-xl transition-colors text-xs font-medium ${
              darkMode
                ? 'text-gray-400 hover:bg-gray-700'
                : 'text-gray-500 hover:bg-gray-100'
            } disabled:opacity-50`}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Add toggle */}
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-semibold hover:shadow-md hover:scale-[1.03] transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
            {showForm ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Form */}
      {showForm && (
        <div
          className={`px-5 py-4 border-b ${
            darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50/60'
          }`}
        >
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            New Medication
          </p>
          <MedicationForm
            darkMode={darkMode}
            userId={resolvedUserId}
            onSuccess={handleFormSuccess}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mx-5 mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Medication List */}
      <div className="p-5">
        <MedicationList
          darkMode={darkMode}
          medications={medications}
          loading={loading}
          onRefresh={fetchMedications}
        />
      </div>
    </div>
  );
};

export default MedicationPage;
