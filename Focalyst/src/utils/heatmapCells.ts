/**
 * Builds a 35-cell (7 cols x 5 rows, Monday-first) heatmap for the current month.
 * 0 = future/padding, 1 = missed past day, 2 = completed day.
 */
export function buildMonthlyHeatmapCells(
  completedDates: string[],
  referenceDate: Date = new Date()
): number[] {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = referenceDate.getDate();

  // Monday-first offset: JS getDay() Sun=0..Sat=6 -> Mon=0..Sun=6
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

  const completedSet = new Set(completedDates);
  const cells: number[] = new Array(35).fill(0);

  for (let day = 1; day <= daysInMonth; day++) {
    const cellIdx = startOffset + day - 1;
    if (cellIdx >= 35) break;
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (completedSet.has(iso)) {
      cells[cellIdx] = 2;
    } else if (day <= todayDate) {
      cells[cellIdx] = 1;
    }
    // future days stay 0
  }

  return cells;
}
