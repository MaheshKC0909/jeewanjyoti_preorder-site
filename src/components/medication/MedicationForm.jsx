import React, { useState } from 'react';
import { X, Pill, Clock, Calendar, ToggleLeft, ToggleRight, Plus, Loader2 } from 'lucide-react';
import { createMedication } from '../../services/medicationApi';

const initialForm = {
  name: '',
  dosage: '',
  frequency: '',
  start_date: '',
  end_date: '',
  skip_date: '',
  medication_status: true,
};

const MedicationForm = ({ darkMode, userId, onSuccess, onClose }) => {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Medication name is required.';
    if (!form.dosage.trim()) errs.dosage = 'Dosage is required.';
    if (!form.frequency.trim()) errs.frequency = 'Frequency is required.';
    if (!form.start_date) errs.start_date = 'Start date is required.';
    if (!form.end_date) errs.end_date = 'End date is required.';
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      errs.end_date = 'End date must be after start date.';
    }
    return errs;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors((prev) => {
      if (prev[name]) {
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return prev;
    });
  };

  const handleToggle = () => {
    setForm((prev) => ({ ...prev, medication_status: !prev.medication_status }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        frequency: form.frequency.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        medication_status: form.medication_status,
      };
      if (form.skip_date) payload.skip_date = form.skip_date;
      if (userId) payload.user_id = userId;

      await createMedication(payload);
      showToast('success', 'Medication added successfully!');
      setForm(initialForm);
      setErrors({});
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to add medication.';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const inputBase = `w-full px-4 py-2.5 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 ${
    darkMode
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
      : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
  }`;

  const labelBase = `block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`;

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1 – Name & Dosage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelBase}>
              <span className="flex items-center gap-1"><Pill className="w-3 h-3" /> Medication Name *</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g., Paracetamol"
              className={`${inputBase} ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className={labelBase}>Dosage *</label>
            <input
              type="text"
              name="dosage"
              value={form.dosage}
              onChange={handleChange}
              placeholder="e.g., 500mg"
              className={`${inputBase} ${errors.dosage ? 'border-red-500' : ''}`}
            />
            {errors.dosage && <p className="text-red-500 text-xs mt-1">{errors.dosage}</p>}
          </div>
        </div>

        {/* Row 2 – Frequency */}
        <div>
          <label className={labelBase}>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Frequency *</span>
          </label>
          <input
            type="text"
            name="frequency"
            value={form.frequency}
            onChange={handleChange}
            placeholder="e.g., Twice daily, Every 8 hours"
            className={`${inputBase} ${errors.frequency ? 'border-red-500' : ''}`}
          />
          {errors.frequency && <p className="text-red-500 text-xs mt-1">{errors.frequency}</p>}
        </div>

        {/* Row 3 – Start & End Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelBase}>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Start Date *</span>
            </label>
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              className={`${inputBase} ${errors.start_date ? 'border-red-500' : ''}`}
            />
            {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
          </div>

          <div>
            <label className={labelBase}>End Date *</label>
            <input
              type="date"
              name="end_date"
              value={form.end_date}
              onChange={handleChange}
              className={`${inputBase} ${errors.end_date ? 'border-red-500' : ''}`}
            />
            {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
          </div>
        </div>

        {/* Row 4 – Skip Date (optional) */}
        <div>
          <label className={labelBase}>Skip Date (optional)</label>
          <input
            type="date"
            name="skip_date"
            value={form.skip_date}
            onChange={handleChange}
            className={inputBase}
          />
        </div>

        {/* Row 5 – Status Toggle */}
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Medication Active
          </span>
          <button
            type="button"
            onClick={handleToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              form.medication_status
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : darkMode
                ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {form.medication_status ? (
              <ToggleRight className="w-5 h-5 text-emerald-600" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
            {form.medication_status ? 'Active' : 'Inactive'}
          </button>
        </div>

        {/* Submit */}
        <div className="pt-2 flex gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                darkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {loading ? 'Saving...' : 'Add Medication'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MedicationForm;
