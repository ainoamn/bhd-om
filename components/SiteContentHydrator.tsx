'use client';

import { useEffect } from 'react';
import { hydrateSiteContentFromServer } from '@/lib/data/siteContent';

/** يحمّل محتوى الموقع من الخادم مرة واحدة — يُحدّث `getSiteContent()` للصفحات العامة */
export default function SiteContentHydrator() {
  useEffect(() => {
    void hydrateSiteContentFromServer();
  }, []);
  return null;
}
