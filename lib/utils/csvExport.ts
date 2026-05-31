/** تنزيل CSV — بديل آمن لـ xlsx (يفتح في Excel) */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const escape = (cell: string | number) => {
    const s = String(cell ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = rows.map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
