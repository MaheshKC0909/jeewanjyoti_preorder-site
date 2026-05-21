import { useState, useEffect } from 'react';
import { useVitalDayDrillDown } from './useVitalDayDrillDown';

/**
 * Local date filter for vital cards. Syncs from the dashboard global range only
 * when that range changes — not when the detail modal (eye) opens or closes.
 */
export function useVitalLocalDateRange(dateRange) {
  const [localDateRange, setLocalDateRange] = useState(dateRange);

  useEffect(() => {
    setLocalDateRange(dateRange);
  }, [dateRange]);

  const { drillToDay, exitDayDrill } = useVitalDayDrillDown(localDateRange, setLocalDateRange);

  return { localDateRange, setLocalDateRange, drillToDay, exitDayDrill };
}
