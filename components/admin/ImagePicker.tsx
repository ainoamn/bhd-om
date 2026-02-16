'use client';

import { useState, useRef } from 'react';
import Icon from '@/components/icons/Icon';

interface ImagePickerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  locale?: string;
}

export default function ImagePicker({ images, onImagesChange, locale = 'ar' }: ImagePickerProps) {
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioImages, setStudioImages] = useState<string[]>([]);
  const [loadingStudio, setLoadingStudio] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openStudio = async () => {
    setStudioOpen(true);
    setLoadingStudio(true);
    try {
      const res = await fetch('/api/media');
      const data = await res.json();
      setStudioImages(data.images || []);
    } catch {
      setStudioImages([]);
    } finally {
      setLoadingStudio(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) onImagesChange([...images, data.url]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const selectFromStudio = (url: string) => {
    if (!images.includes(url)) onImagesChange([...images, url]);
    setStudioOpen(false);
  };

  const removeImage = (idx: number) => {
    onImagesChange(images.filter((_, i) => i !== idx));
  };

  const setMainImage = (idx: number) => {
    if (idx === 0) return;
    const arr = [...images];
    [arr[0], arr[idx]] = [arr[idx], arr[0]];
    onImagesChange(arr);
  };

  const ar = locale === 'ar';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="admin-btn-secondary inline-flex items-center gap-2"
        >
          <Icon name="plus" className="w-5 h-5" />
          {uploading ? (ar ? 'جاري الرفع...' : 'Uploading...') : (ar ? 'من الجهاز' : 'From Device')}
        </button>
        <button
          type="button"
          onClick={openStudio}
          className="admin-btn-secondary inline-flex items-center gap-2"
        >
          <Icon name="archive" className="w-5 h-5" />
          {ar ? 'من الاستوديو' : 'From Studio'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((url, idx) => (
          <div key={url + idx} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <img src={url} alt="" className="w-full h-24 object-cover" />
            {idx === 0 && (
              <span className="absolute top-1 start-1 px-2 py-0.5 rounded text-xs bg-primary text-white font-medium">
                {ar ? 'رئيسية' : 'Main'}
              </span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => setMainImage(idx)}
                  className="p-2 rounded-full bg-white/90 text-gray-800 hover:bg-white"
                  title={ar ? 'تعيين كرئيسية' : 'Set as main'}
                >
                  <Icon name="home" className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                title={ar ? 'حذف' : 'Remove'}
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {studioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setStudioOpen(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold">{ar ? 'اختر من الاستوديو' : 'Select from Studio'}</h3>
              <button type="button" onClick={() => setStudioOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingStudio ? (
                <p className="text-center py-8 text-gray-500">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
              ) : studioImages.length === 0 ? (
                <p className="text-center py-8 text-gray-500">{ar ? 'لا توجد صور في الاستوديو. ارفع صوراً من الجهاز أولاً.' : 'No images in studio. Upload from device first.'}</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {studioImages.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => selectFromStudio(url)}
                      className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary hover:scale-105 transition-all"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
