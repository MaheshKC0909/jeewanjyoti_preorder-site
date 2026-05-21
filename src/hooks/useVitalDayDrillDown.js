import { useCallback } from 'react';
import { buildDrillDownRange, buildReturnFromDrillDown } from '../utils/vitalDateRange';

export function useVitalDayDrillDown(_localDateRange, setLocalDateRange) {
  const drillToDay = useCallback(
    (day) => setLocalDateRange((prev) => buildDrillDownRange(prev, day)),
    [setLocalDateRange]
  );

  const exitDayDrill = useCallback(
    () => setLocalDateRange((prev) => buildReturnFromDrillDown(prev)),
    [setLocalDateRange]
  );

  return { drillToDay, exitDayDrill };
}
