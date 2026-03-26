'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { clearDraft, loadDraft, saveDraft } from '@/lib/utils/draftStorage';

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

async function scanifyDocumentDataUrl(dataUrl: string, maxW = 1280): Promise<string> {
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
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  // Color "scan": boost contrast/brightness while preserving color.
  // Keep it lightweight (no heavy filters).
  const contrast = 1.22;
  const brightness = 10; // -255..255
  const saturation = 1.08;
  for (let i = 0; i < d.length; i += 4) {
    const r0 = d[i]!;
    const g0 = d[i + 1]!;
    const b0 = d[i + 2]!;
    const y = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;

    let r = (r0 - 128) * contrast + 128 + brightness;
    let g = (g0 - 128) * contrast + 128 + brightness;
    let b = (b0 - 128) * contrast + 128 + brightness;

    // saturation: pull away from luminance while keeping color
    r = y + (r - y) * saturation;
    g = y + (g - y) * saturation;
    b = y + (b - y) * saturation;

    d[i] = Math.max(0, Math.min(255, Math.round(r)));
    d[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    d[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    d[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

type FacingMode = 'user' | 'environment';

function CameraCapture({
  ar,
  facingMode,
  title,
  description,
  value,
  onChange,
  mode,
}: {
  ar: boolean;
  facingMode: FacingMode;
  title: string;
  description?: string;
  value: string;
  onChange: (dataUrl: string) => void;
  mode?: 'PHOTO' | 'DOC_SCAN';
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [camError, setCamError] = useState('');

  const stop = () => {
    const s = streamRef.current;
    if (s) {
      for (const t of s.getTracks()) t.stop();
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const start = async () => {
    setCamError('');
    setStarting(true);
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
      }
    } catch (e) {
      setCamError(e instanceof Error ? e.message : ar ? 'تعذر فتح الكاميرا' : 'Failed to open camera');
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    // افتح الكاميرا تلقائياً طالما لا توجد صورة ملتقطة
    if (!isDataUrlImage(value)) {
      void start();
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const capture = async () => {
    setCamError('');
    const v = videoRef.current;
    if (!v) return;
    const w = Math.max(1, v.videoWidth || 0);
    const h = Math.max(1, v.videoHeight || 0);
    if (w < 2 || h < 2) {
      setCamError(ar ? 'انتظر تشغيل الكاميرا ثم حاول مرة أخرى' : 'Camera not ready yet');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    const raw = canvas.toDataURL('image/jpeg', 0.9);
    const compressed = await compressImageDataUrl(raw, 1080, 0.82);
    const out = mode === 'DOC_SCAN' ? await scanifyDocumentDataUrl(compressed, 1400) : compressed;
    onChange(out);
    stop();
  };

  const retake = async () => {
    onChange('');
    await start();
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-[16px] font-semibold text-stone-900">{title}</h2>
      {description ? <p className="mt-1 text-xs text-stone-600">{description}</p> : null}

      {camError ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">{camError}</div> : null}

      <div className="mt-3 space-y-3">
        {isDataUrlImage(value) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="capture" className="w-full rounded-2xl border border-stone-200 bg-stone-50" />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-black">
            <video ref={videoRef} playsInline muted className="h-80 w-full object-cover" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={starting || isDataUrlImage(value)}
            onClick={capture}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white ${starting || isDataUrlImage(value) ? 'bg-stone-400' : 'bg-[#8B6F47]'}`}
          >
            {ar ? 'التقاط' : 'Capture'}
          </button>
          <button
            type="button"
            disabled={starting}
            onClick={() => (isDataUrlImage(value) ? void retake() : void start())}
            className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-800"
          >
            {isDataUrlImage(value) ? (ar ? 'إعادة الالتقاط' : 'Retake') : ar ? 'تشغيل الكاميرا' : 'Start camera'}
          </button>
        </div>
      </div>
    </div>
  );
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

  type Step = 'SELFIE' | 'SIGN' | 'ID';

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ApiReq | null>(null);
  const [error, setError] = useState('');
  const [selfie, setSelfie] = useState<string>('');
  const [selfieSaved, setSelfieSaved] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [idCardFront, setIdCardFront] = useState<string>('');
  const [idCardFrontSaved, setIdCardFrontSaved] = useState(false);
  const [idCardBack, setIdCardBack] = useState<string>('');
  const [idCardBackSaved, setIdCardBackSaved] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('SELFIE');
  const draftKey = useMemo(() => `sign_${token}`, [token]);

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

  useEffect(() => {
    if (!token) return;
    const d = loadDraft<{
      step?: Step;
      selfie?: string;
      selfieSaved?: boolean;
      signature?: string;
      signatureSaved?: boolean;
      idCardFront?: string;
      idCardFrontSaved?: boolean;
      idCardBack?: string;
      idCardBackSaved?: boolean;
      name?: string;
    }>(draftKey);
    if (!d) return;
    if (d.step === 'SELFIE' || d.step === 'SIGN' || d.step === 'ID') setStep(d.step);
    if (typeof d.selfie === 'string') setSelfie(d.selfie);
    if (typeof d.selfieSaved === 'boolean') setSelfieSaved(d.selfieSaved);
    if (typeof d.signature === 'string') setSignature(d.signature);
    if (typeof d.signatureSaved === 'boolean') setSignatureSaved(d.signatureSaved);
    if (typeof d.idCardFront === 'string') setIdCardFront(d.idCardFront);
    if (typeof d.idCardFrontSaved === 'boolean') setIdCardFrontSaved(d.idCardFrontSaved);
    if (typeof d.idCardBack === 'string') setIdCardBack(d.idCardBack);
    if (typeof d.idCardBackSaved === 'boolean') setIdCardBackSaved(d.idCardBackSaved);
    if (typeof d.name === 'string') setName(d.name);
  }, [draftKey, token]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      saveDraft(draftKey, {
        step,
        selfie,
        selfieSaved,
        signature,
        signatureSaved,
        idCardFront,
        idCardFrontSaved,
        idCardBack,
        idCardBackSaved,
        name,
      });
    }, 800);
    return () => window.clearTimeout(t);
  }, [draftKey, step, selfie, selfieSaved, signature, signatureSaved, idCardFront, idCardFrontSaved, idCardBack, idCardBackSaved, name]);

  const canSubmit = useMemo(
    () =>
      selfieSaved &&
      signatureSaved &&
      idCardFrontSaved &&
      idCardBackSaved &&
      isDataUrlImage(selfie) &&
      isDataUrlImage(signature) &&
      isDataUrlImage(idCardFront) &&
      isDataUrlImage(idCardBack) &&
      !submitting,
    [selfieSaved, signatureSaved, idCardFrontSaved, idCardBackSaved, selfie, signature, idCardFront, idCardBack, submitting]
  );

  // لا نسمح برفع ملفات؛ الالتقاط يتم مباشرة من كاميرا الهاتف

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
          idCardFrontDataUrl: idCardFront,
          idCardBackDataUrl: idCardBack,
          signatureName: name.trim(),
          deviceInfo: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(String(j?.error || (ar ? 'فشل إرسال التوقيع' : 'Failed to submit')));
      }
      await res.json();
      setInfo((prev) => (prev ? ({ ...prev, request: { ...(prev.request as any), status: 'COMPLETED' } } as any) : prev));
      setSelfie('');
      setSelfieSaved(false);
      setSignature('');
      setSignatureSaved(false);
      setIdCardFront('');
      setIdCardFrontSaved(false);
      setIdCardBack('');
      setIdCardBackSaved(false);
      setStep('SELFIE');
      clearDraft(draftKey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : ar ? 'حدث خطأ' : 'Error';
      setError(msg);
      // تسجيل فشل التوقيع ليظهر في لوحة المتابعة
      try {
        await fetch(`/api/signature-request/${encodeURIComponent(token)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: msg }),
        });
      } catch {
        // ignore
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-stone-600">{ar ? 'جاري التحميل…' : 'Loading…'}</div>;
  }
  if (error && !info) {
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
          <p className="mt-2 text-sm">{ar ? 'شكراً لك. تم حفظ السلفي والتوقيع وصور البطاقة في النظام.' : 'Thank you. Your selfie, signature, and ID images were saved.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-lg space-y-6 p-4 pb-16">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h1 className="text-[20px] font-bold text-stone-900">{ar ? 'توثيق العقد' : 'Contract verification'}</h1>
          <p className="mt-2 text-sm text-stone-600">{ar ? 'اتبع الخطوات بالتسلسل لإكمال التوثيق.' : 'Follow the steps in order to complete verification.'}</p>
        </div>

        {step === 'SELFIE' ? (
          <>
            <CameraCapture
              ar={ar}
              facingMode="user"
              title={ar ? '١) صورة سلفي' : '1) Selfie'}
              description={ar ? 'سيتم فتح الكاميرا مباشرة لالتقاط السلفي.' : 'Camera opens directly to capture a selfie.'}
              value={selfie}
              mode="PHOTO"
              onChange={(v) => {
                setSelfie(v);
                setSelfieSaved(false);
              }}
            />
            <button
              type="button"
              disabled={!isDataUrlImage(selfie)}
              onClick={() => {
                setSelfieSaved(true);
                setStep('SIGN');
              }}
              className={`w-full rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-md ${
                isDataUrlImage(selfie) ? 'bg-gradient-to-l from-[#8B6F47] to-[#6B5535]' : 'bg-stone-400'
              }`}
            >
              {ar ? 'حفظ السلفي والمتابعة للتوقيع' : 'Save selfie & continue'}
            </button>
          </>
        ) : null}

        {step === 'SIGN' ? (
          <>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-[16px] font-semibold text-stone-900">{ar ? '٢) التوقيع' : '2) Signature'}</h2>
              <p className="mt-1 text-xs text-stone-600">{ar ? 'وقّع بإصبعك داخل المربع.' : 'Sign with your finger inside the box.'}</p>
              <div className="mt-3">
                <SignaturePad
                  onChange={(v) => {
                    setSignature(v);
                    setSignatureSaved(false);
                  }}
                />
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
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep('SELFIE')}
                className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-800 shadow-sm"
              >
                {ar ? 'رجوع' : 'Back'}
              </button>
              <button
                type="button"
                disabled={!isDataUrlImage(signature)}
                onClick={() => {
                  setSignatureSaved(true);
                  setStep('ID');
                }}
                className={`rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-md ${
                  isDataUrlImage(signature) ? 'bg-gradient-to-l from-[#8B6F47] to-[#6B5535]' : 'bg-stone-400'
                }`}
              >
                {ar ? 'حفظ التوقيع والمتابعة للبطاقة' : 'Save signature & continue'}
              </button>
            </div>
          </>
        ) : null}

        {step === 'ID' ? (
          <>
            <CameraCapture
              ar={ar}
              facingMode="environment"
              title={ar ? '٣) البطاقة الشخصية (الأمام)' : '3) ID card (front)'}
              description={ar ? 'استخدم الكاميرا الخلفية لتصوير وجه البطاقة الأمامي.' : 'Use the back camera to capture the front side.'}
              value={idCardFront}
              mode="DOC_SCAN"
              onChange={(v) => {
                setIdCardFront(v);
                setIdCardFrontSaved(false);
              }}
            />
            <button
              type="button"
              disabled={!isDataUrlImage(idCardFront)}
              onClick={() => setIdCardFrontSaved(true)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${
                isDataUrlImage(idCardFront) ? 'bg-[#8B6F47] text-white' : 'bg-stone-300 text-stone-600'
              }`}
            >
              {idCardFrontSaved ? (ar ? 'تم حفظ صورة الأمام' : 'Front saved') : ar ? 'حفظ صورة الأمام' : 'Save front'}
            </button>

            <CameraCapture
              ar={ar}
              facingMode="environment"
              title={ar ? '٤) البطاقة الشخصية (الخلف)' : '4) ID card (back)'}
              description={ar ? 'الآن صوّر وجه البطاقة الخلفي.' : 'Now capture the back side.'}
              value={idCardBack}
              mode="DOC_SCAN"
              onChange={(v) => {
                setIdCardBack(v);
                setIdCardBackSaved(false);
              }}
            />
            <button
              type="button"
              disabled={!isDataUrlImage(idCardBack)}
              onClick={() => setIdCardBackSaved(true)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${
                isDataUrlImage(idCardBack) ? 'bg-[#8B6F47] text-white' : 'bg-stone-300 text-stone-600'
              }`}
            >
              {idCardBackSaved ? (ar ? 'تم حفظ صورة الخلف' : 'Back saved') : ar ? 'حفظ صورة الخلف' : 'Save back'}
            </button>
          </>
        ) : null}

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

