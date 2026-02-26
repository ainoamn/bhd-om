'use client';

import { useParams } from 'next/navigation';
import { useDrafts } from '@/lib/hooks/useDrafts';
import Icon from '@/components/icons/Icon';

export default function DraftBanner() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { hasDrafts, draftCount } = useDrafts();

  if (!hasDrafts) return null;

  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 bg-amber-50 border-b border-amber-200 text-amber-900"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Icon name="information" className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <p className="font-semibold">
            {ar ? 'لديك بيانات غير محفوظة' : 'You have unsaved data'}
          </p>
          <p className="text-sm text-amber-800">
            {ar
              ? 'البيانات المدخلة لن تظهر في النظام ولا تُطبق إلا بعد النقر على زر "حفظ"'
              : 'Entered data will not be visible or applied until you click "Save"'}
          </p>
        </div>
      </div>
      {draftCount > 0 && (
        <span className="text-sm font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-lg">
          {draftCount} {ar ? (draftCount === 1 ? 'مسودة' : 'مسودات') : (draftCount === 1 ? 'draft' : 'drafts')}
        </span>
      )}
    </div>
  );
}
