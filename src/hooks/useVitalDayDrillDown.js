import { useCallback } from 'react';
import { buildDrillDownRange, buildReturnFromDrillDown } from '../utils/vitalDateRange';

export function useVitalDayDrillDown(localDateRange, setLocalDateRange) {
  const drillToDay = useCallback(
    (day) => setLocalDateRange(buildDrillDownRange(localDateRange, day)),
    [localDateRange, setLocalDateRange]
  );

  const exitDayDrill = useCallback(
    () => setLocalDateRange(buildReturnFromDrillDown(localDateRange)),
    [localDateRange, setLocalDateRange]
  );

  return { drillToDay, exitDayDrill };
}
