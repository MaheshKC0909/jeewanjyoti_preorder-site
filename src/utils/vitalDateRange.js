/** Single-day intraday view (API ?date=YYYY-MM-DD). */
export function isDayDrillDown(range) {
  return Boolean(range?.customRange && range?.date);
}

/** Week / month multiday summary (bars, capsules, ribbons). */
export function isMultidayPeriod(range) {
  if (isDayDrillDown(range)) return false;
  return !range?.customRange && (range?.period === 'week' || range?.period === 'month');
}

export function formatDayLabel(dayStr) {
  if (!dayStr) return '';
  const match = String(dayStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(dayStr);
  if (Number.isNaN(d.getTime())) return String(dayStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Drill from 7d/30d chart into one day's intraday readings. */
export function buildDrillDownRange(currentRange, day) {
  const dayISO = typeof day === 'string' ? day : (day?.day ?? day?.dayISO);
  const parentPeriod =
    currentRange?.parentPeriod ||
    (currentRange?.period === 'month' ? 'month' : currentRange?.period === 'week' ? 'week' : 'week');
  return {
    parentPeriod,
    period: parentPeriod,
    customRange: true,
    date: dayISO,
    drillDown: true,
  };
}

/** Return to the week/month range the user had before drilling. */
export function buildReturnFromDrillDown(range) {
  const period = range?.parentPeriod || 'week';
  return { period, customRange: false, drillDown: false };
}

/** Modal/card filter: Today, 7 Days, 30 Days. */
export function buildPeriodFilterRange(period) {
  return { period, customRange: false, drillDown: false };
}
