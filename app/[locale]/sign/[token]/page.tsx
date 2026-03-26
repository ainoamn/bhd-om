'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type ApiReq = {
  ok: true;
  request: {
    token: string;
    bookingId: string;
    contractKind?: string;
    actorRole: string;
    status: string;
    createdAt: string;
    completedAt?: string;
  };
  booking?: { id?: string; name?: string; phone?: string; contractStage?: string; contractKind?: string };
};

function isDataUrlImage(s: string) {
  return typeof s === 'string' && s.startsWith('data:image/');
}

async function compressImageDataUrl(dataUrl: string, maxW = 720, jpegQuality = 0.75): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('image load failed'));
  });
  const scale = Math.min(1, maxW / Math.max(1, img.width));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', jpegQuality);
}

function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const resize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const prev = canvas.toDataURL('image/png');
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.2;
    // restore
    const img = new Image();
    img.src = prev;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
  };

  useEffect(() => {
    resize();
    const onR = () => resize();
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPos = (e: PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const begin = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    last.current = getPos(e.nativeEvent);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = getPos(e.nativeEvent);
    const l = last.current;
    if (l) {
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    last.current = p;
  };

  const end = () => {
    drawing.current = false;
    last.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    onChange('');
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <canvas
          ref={canvasRef}
          className="h-48 w-full touch-none bg-white"
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      </div>
      <button
        type="button"
        onClick={clear}
        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-800"
      >
        مسح التوقيع
      </button>
    </div>
  );
}

export default function SignPage() {
  const params = useParams();
  const token = String((params as any)?.token || '');
  const locale = String((params as any)?.locale || 'ar');
  const ar = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ApiReq | null>(null);
  const [error, setError] = useState('');
  const [selfie, setSelfie] = useState<string>('');
  const [signature, setSignature] = useState<string>('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/signature-request/${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(ar ? 'تعذر تحميل رابط التوقيع' : 'Failed to load signing link');
        const data = (await res.json()) as ApiReq;
        if (!alive) return;
        setInfo(data);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : ar ? 'حدث خطأ' : 'Error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, ar]);

  const canSubmit = useMemo(() => isDataUrlImage(selfie) && isDataUrlImage(signature) && !submitting, [selfie, signature, submitting]);

  const onPickSelfie = async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
    const compressed = await compressImageDataUrl(dataUrl, 720, 0.75);
    setSelfie(compressed);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/signature-request/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selfieDataUrl: selfie,
          signatureDataUrl: signature,
          signatureName: name.trim(),
          deviceInfo: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(String(j?.error || (ar ? 'فشل إرسال التوقيع' : 'Failed to submit')));
      }
      const j = await res.json();
      setInfo((prev) => (prev ? ({ ...prev, request: { ...(prev.request as any), status: 'COMPLETED' } } as any) : prev));
      setSelfie('');
      setSignature('');
    } catch (e) {
      setError(e instanceof Error ? e.message : ar ? 'حدث خطأ' : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-stone-600">{ar ? 'جاري التحميل…' : 'Loading…'}</div>;
  }
  if (error) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <p className="font-bold">{ar ? 'تنبيه' : 'Notice'}</p>
          <p className="mt-2 text-sm leading-relaxed">{error}</p>
          <Link className="mt-4 inline-block font-semibold text-[#8B6F47] underline" href={`/${locale}/login`}>
            {ar ? 'تسجيل الدخول' : 'Login'}
          </Link>
        </div>
      </div>
    );
  }

  const status = info?.request?.status;
  if (status === 'COMPLETED') {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
          <p className="text-lg font-bold">{ar ? 'تم التوقيع بنجاح' : 'Signed successfully'}</p>
          <p className="mt-2 text-sm">{ar ? 'شكراً لك. تم حفظ السلفي والتوقيع في النظام.' : 'Thank you. Your selfie and signature were saved.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-lg space-y-6 p-4 pb-16">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h1 className="text-[20px] font-bold text-stone-900">{ar ? 'توثيق العقد' : 'Contract verification'}</h1>
          <p className="mt-2 text-sm text-stone-600">
            {ar ? 'الخطوات: 1) التقط صورة سلفي 2) وقّع بإصبعك 3) إرسال' : 'Steps: 1) Take a selfie 2) Sign 3) Submit'}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-[16px] font-semibold text-stone-900">{ar ? '١) صورة سلفي' : '1) Selfie'}</h2>
          <p className="mt-1 text-xs text-stone-600">{ar ? 'ستُستخدم للتوثيق فقط.' : 'Used for verification only.'}</p>
          <div className="mt-3 space-y-3">
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => onPickSelfie(e.target.files?.[0] || null)}
              className="block w-full text-sm"
            />
            {isDataUrlImage(selfie) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selfie} alt="selfie" className="w-full rounded-xl border border-stone-200" />
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-[16px] font-semibold text-stone-900">{ar ? '٢) التوقيع' : '2) Signature'}</h2>
          <p className="mt-1 text-xs text-stone-600">{ar ? 'وقّع داخل المربع.' : 'Sign in the box.'}</p>
          <div className="mt-3">
            <SignaturePad onChange={setSignature} />
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold text-stone-700">{ar ? 'الاسم (اختياري)' : 'Name (optional)'}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#8B6F47]"
              placeholder={ar ? 'اكتب اسمك' : 'Type your name'}
            />
          </div>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">{error}</div> : null}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className={`w-full rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-md ${
            canSubmit ? 'bg-gradient-to-l from-[#8B6F47] to-[#6B5535]' : 'bg-stone-400'
          }`}
        >
          {submitting ? (ar ? 'جاري الإرسال…' : 'Submitting…') : ar ? 'إرسال التوثيق والتوقيع' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

