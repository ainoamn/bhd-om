'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

interface ClaimsPaymentsExportButtonsProps {
  tableData: Array<Record<string, string | number>>;
  headers: { key: string; labelAr: string; labelEn: string }[];
  printAreaId: string;
  filename: string;
  ar: boolean;
}

export default function ClaimsPaymentsExportButtons({
  tableData,
  headers,
  printAreaId,
  filename,
  ar,
}: ClaimsPaymentsExportButtonsProps) {
  const [open, setOpen] = useState(false);

  const handlePrint = () => {
    const el = document.getElementById(printAreaId);
    if (!el) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${ar ? 'rtl' : 'ltr'}">
      <head><meta charset="UTF-8"><title>${filename}</title>
      <style>body{font-family:Segoe UI,Tahoma,Arial,sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd;padding:8px;text-align:right;} th{background:#f3f4f6;}</style>
      </head>
      <body>${el.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handlePdf = () => {
    handlePrint();
  };

  const handleExcel = () => {
    const labels = headers.map((h) => (ar ? h.labelAr : h.labelEn));
    const rows = tableData.map((row) => headers.map((h) => row[h.key] ?? ''));
    const data = [labels, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, filename.slice(0, 31));
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const handleWord = () => {
    const el = document.getElementById(printAreaId);
    if (!el) return;
    const html = `<!DOCTYPE html><html dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><title>${filename}</title></head><body>${el.outerHTML}</body></html>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm font-semibold text-[#8B6F47] hover:underline flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#8B6F47]/30 bg-white hover:bg-amber-50"
      >
        📥 {ar ? 'تصدير' : 'Export'} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className={`absolute ${ar ? 'left-0' : 'right-0'} top-full mt-1 z-50 min-w-[180px] bg-white rounded-xl shadow-lg border border-gray-200 py-1`}>
            <button type="button" onClick={() => { handlePrint(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
              🖨️ {ar ? 'طباعة' : 'Print'}
            </button>
            <button type="button" onClick={() => { handlePdf(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
              📄 PDF
            </button>
            <button type="button" onClick={() => { handleExcel(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
              📊 Excel
            </button>
            <button type="button" onClick={() => { handleWord(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
              📝 Word
            </button>
          </div>
        </>
      )}
    </div>
  );
}
