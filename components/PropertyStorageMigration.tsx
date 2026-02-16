'use client';

import { useEffect } from 'react';
import { migratePropertyStorage } from '@/lib/data/properties';

/** يشغّل ترحيل بيانات العقارات القديمة عند التحميل */
export default function PropertyStorageMigration() {
  useEffect(() => {
    migratePropertyStorage();
  }, []);
  return null;
}
