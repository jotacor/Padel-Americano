/** Local date as YYYY-MM-DD (zero-padded): tournament names and export file names */
export const ymd = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
