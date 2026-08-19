'use client';

import { BHD_APPS } from '@/lib/bhd/apps';
import { BhdAppIcon } from '@/components/bhd/BhdAppIcon';

export default function BhdProgramsFooter({ locale }: { locale: string }) {
  const ar = locale === 'ar';
  const apps = BHD_APPS.filter((app) => app.id !== 'account');

  return (
    <div className="sm:col-span-2 lg:col-span-4 mt-4 pt-8 border-t border-gray-700">
      <h4 className="text-lg font-bold mb-4 text-white">
        {ar ? 'برامجنا' : 'Our apps'}
      </h4>
      <div className="flex flex-wrap gap-3 mb-4">
        {apps.map((app) => (
          <a
            key={app.id}
            href={app.enabled && app.origin ? `${app.origin.replace(/\/$/, '')}/` : 'https://www.bhd-om.com/apps'}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 min-h-[44px] bg-gray-800 hover:bg-gray-700 text-sm font-semibold ${
              app.enabled ? 'text-white' : 'text-gray-500 pointer-events-none'
            }`}
            aria-disabled={!app.enabled}
          >
            <BhdAppIcon id={app.id} title={ar ? app.nameAr : app.nameEn} />
            <span>{ar ? app.nameAr : app.nameEn}</span>
          </a>
        ))}
      </div>
      <p className="text-sm text-gray-400">
        <a href="https://www.bhd-om.com/apps" className="text-primary hover:underline font-semibold">
          {ar ? 'كل التطبيقات وشرحها' : 'All apps and how they work'}
        </a>
        {' · '}
        <a href="https://www.bhd-om.com/about" className="hover:text-primary">
          {ar ? 'عن الشركة' : 'About'}
        </a>
        {' · '}
        <a href="https://www.bhd-om.com/brand" className="hover:text-primary">
          {ar ? 'هوية الشركة' : 'Brand'}
        </a>
      </p>
    </div>
  );
}
