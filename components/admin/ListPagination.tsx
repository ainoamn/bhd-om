'use client';

type Props = {
  ar: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export default function ListPagination({ ar, page, pageSize, total, onPageChange, className = '' }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 text-sm ${className}`}>
      <span className="text-gray-600">
        {ar ? `عرض ${from}–${to} من ${total}` : `Showing ${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-40"
        >
          {ar ? '← السابق' : '← Prev'}
        </button>
        <span className="font-medium text-gray-800">
          {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-40"
        >
          {ar ? 'التالي →' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
