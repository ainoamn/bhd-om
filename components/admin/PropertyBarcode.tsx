'use client';

import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { LOGO_DATA_URI } from '@/lib/logoDataUri';

interface PropertyBarcodeProps {
  propertyId: number | string;
  unitKey?: string;
  locale: string;
  size?: number;
  className?: string;
}

/** باركود QR لكل عقار - عند المسح يفتح صفحة تفاصيل العقار الكاملة */
export default function PropertyBarcode({ propertyId, unitKey, locale, size = 36, className = '' }: PropertyBarcodeProps) {
  const [showFull, setShowFull] = useState(false);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const url = unitKey
    ? `${base}/${locale}/scan/property/${propertyId}?unit=${encodeURIComponent(unitKey)}`
    : `${base}/${locale}/scan/property/${propertyId}`;

  /** حجم الشعار داخل الباركود — نسبة ~28% من حجم QR لضمان المسح السليم */
  const logoSize = Math.max(8, Math.floor(size * 0.28));

  const imageSettings = {
    src: LOGO_DATA_URI,
    height: logoSize,
    width: logoSize,
    excavate: true,
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setShowFull(!showFull)}
        className="p-0.5 rounded hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
        title={locale === 'ar' ? (showFull ? 'إخفاء' : 'مسح لعرض التفاصيل') : (showFull ? 'Close' : 'Scan to view details')}
        aria-label="Barcode"
      >
        <QRCodeCanvas value={url} size={size} level="H" includeMargin={false} imageSettings={imageSettings} />
      </button>
      {showFull && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowFull(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setShowFull(false)}
          aria-label="Close"
        >
          <div
            className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-gray-600 mb-3 text-center">
              {locale === 'ar' ? 'مسح الباركود لعرض تفاصيل العقار الكاملة' : 'Scan barcode to view full property details'}
            </p>
            <div className="flex justify-center p-4 bg-white rounded-xl border border-gray-200">
              <QRCodeCanvas
                value={url}
                size={200}
                level="H"
                includeMargin
                imageSettings={{
                  src: LOGO_DATA_URI,
                  height: 56,
                  width: 56,
                  excavate: true,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center break-all">
              {url}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
