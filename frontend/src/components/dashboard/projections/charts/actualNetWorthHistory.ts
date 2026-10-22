export interface ActualNetWorthPoint {
  date: string;
  actual?: number;
}

// Actual net worth points before the projection, skipping leading months without data
export const buildActualHistory = (
  historicalDates: string[] = [],
  actualSeries: (number | null)[] = []
): ActualNetWorthPoint[] => {
  const firstIndex = actualSeries.findIndex((value) => value !== null);
  if (firstIndex === -1) return [];
  return historicalDates
    .slice(firstIndex)
    .map((date, i) => ({ date, actual: actualSeries[firstIndex + i] ?? undefined }));
};
