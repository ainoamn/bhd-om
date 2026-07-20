"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractName: string;
  onSuccess?: () => void;
}

interface SendOtpPayload {
  contractId: string;
  method: "SMS" | "EMAIL";
  sendTo: string;
}

interface SendOtpResponse {
  signatureId: string;
  message: string;
  expiresAt: string;
}

interface VerifyOtpPayload {
  signatureId: string;
  otp: string;
}

interface VerifyOtpResponse {
  success: boolean;
  message: string;
  signedAt: string;
}

type Step = 1 | 2 | 3;
type DeliveryMethod = "SMS" | "EMAIL";

// ── Utility: countdown formatter ───────────────────────────────────

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ── Component ──────────────────────────────────────────────────────

export default function SignatureModal({
  isOpen,
  onClose,
  contractId,
  contractName,
  onSuccess,
}: Props) {
  // Steps & flow
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<DeliveryMethod>("SMS");
  const [sendTo, setSendTo] = useState("");

  // OTP (6 digits)
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // API / async state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server response data
  const [signatureId, setSignatureId] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Countdown timer
  const [countdown, setCountdown] = useState<number>(600); // 10 minutes
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    setStep(1);
    setMethod("SMS");
    setSendTo("");
    setOtp(new Array(6).fill(""));
    setLoading(false);
    setError(null);
    setSignatureId("");
    setSuccessMsg("");
    setCountdown(600);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startCountdown = useCallback((seconds: number) => {
    setCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── OTP input handlers ───────────────────────────────────────────

  const handleOtpChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    if (!val) return;

    const next = [...otp];
    next[index] = val;
    setOtp(next);

    // Auto-focus next
    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...otp];
      if (next[index]) {
        next[index] = "";
        setOtp(next);
      } else if (index > 0) {
        next[index - 1] = "";
        setOtp(next);
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      next[i] = pasted[i];
    }
    setOtp(next);
    const focusIndex = Math.min(pasted.length, 5);
    otpRefs.current[focusIndex]?.focus();
  };

  // ── API calls ────────────────────────────────────────────────────

  const handleSendOtp = async () => {
    if (!sendTo.trim()) {
      setError(
        method === "SMS"
          ? "يرجى إدخال رقم الهاتف"
          : "يرجى إدخال البريد الإلكتروني"
      );
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const payload: SendOtpPayload = { contractId, method, sendTo };
      const res = await fetch("/api/portal/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: SendOtpResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "حدث خطأ أثناء إرسال الرمز");
      }

      setSignatureId(data.signatureId);
      setStep(2);

      // Calculate remaining seconds from expiresAt
      const expiresAt = new Date(data.expiresAt).getTime();
      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      startCountdown(remainingSeconds);

      // Focus first OTP box
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("يرجى إدخال الرمز المكون من 6 أرقام");
      return;
    }
    if (countdown <= 0) {
      setError("انتهت صلاحية الرمز، يرجى طلب رمز جديد");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload: VerifyOtpPayload = { signatureId, otp: otpCode };
      const res = await fetch("/api/portal/signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: VerifyOtpResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "رمز التحقق غير صحيح");
      }

      setSuccessMsg(data.message);
      setStep(3);
      if (timerRef.current) clearInterval(timerRef.current);
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Cleanup timer on unmount ─────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  // ── Render helpers ───────────────────────────────────────────────

  if (!isOpen) return null;

  const methodLabel = method === "SMS" ? "رقم الهاتف" : "البريد الإلكتروني";
  const methodPlaceholder =
    method === "SMS" ? "مثال: 91234567" : "مثال: example@email.com";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      dir="rtl"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1A1A2E] to-[#2d2d44] px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                توقيع العقد الذكي
              </h2>
              <p className="mt-1 text-sm text-white/70">{contractName}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="إغلاق"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    s === step
                      ? "bg-[#C8102E] text-white"
                      : s < step
                        ? "bg-emerald-500 text-white"
                        : "bg-white/20 text-white/60"
                  }`}
                >
                  {s < step ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    s
                  )}
                </div>
                {s < 3 && (
                  <div
                    className={`h-0.5 flex-1 rounded-full transition-colors ${
                      s < step ? "bg-emerald-500" : "bg-white/20"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* ── Step 1: Select Method ──────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
              <p className="text-sm text-gray-600">
                اختر طريقة استلام رمز التحقق لتوقيع العقد
              </p>

              {/* Method buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setMethod("SMS");
                    setError(null);
                  }}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all ${
                    method === "SMS"
                      ? "border-[#C8102E] bg-red-50 text-[#C8102E]"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.72v-3.5a2.25 2.25 0 012.25-2.25h6.75a2.25 2.25 0 012.25 2.25v3.5m-12 0h12"
                    />
                  </svg>
                  <span className="text-sm font-semibold">
                    رسالة نصية (SMS)
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMethod("EMAIL");
                    setError(null);
                  }}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all ${
                    method === "EMAIL"
                      ? "border-[#C8102E] bg-red-50 text-[#C8102E]"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                  <span className="text-sm font-semibold">
                    البريد الإلكتروني
                  </span>
                </button>
              </div>

              {/* Input */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {methodLabel}
                </label>
                <input
                  type={method === "SMS" ? "tel" : "email"}
                  value={sendTo}
                  onChange={(e) => {
                    setSendTo(e.target.value);
                    setError(null);
                  }}
                  placeholder={methodPlaceholder}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-right text-gray-900 transition-colors placeholder:text-gray-400 focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20"
                  dir="ltr"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 animate-in fade-in">
                  <svg
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C8102E] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#a00d24] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <span>إرسال الرمز</span>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Step 2: Enter OTP ──────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  تم إرسال رمز التحقق إلى{" "}
                  <span className="font-semibold text-gray-900" dir="ltr">
                    {sendTo}
                  </span>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  أدخل الرمز المكون من 6 أرقام أدناه
                </p>
              </div>

              {/* Countdown */}
              <div
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
                  countdown <= 60
                    ? "bg-red-50 text-red-600"
                    : "bg-gray-50 text-gray-700"
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  {countdown > 0
                    ? `الوقت المتبقي: ${formatCountdown(countdown)}`
                    : "انتهت صلاحية الرمز"}
                </span>
              </div>

              {/* OTP boxes */}
              <div className="flex justify-center gap-2" dir="ltr">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    disabled={countdown <= 0 || loading}
                    className={`h-12 w-12 rounded-lg border-2 text-center text-xl font-bold text-gray-900 transition-all focus:outline-none ${
                      digit
                        ? "border-[#C8102E] bg-red-50"
                        : "border-gray-300 focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/20"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  />
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 animate-in fade-in">
                  <svg
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep(1);
                    setOtp(new Array(6).fill(""));
                    setError(null);
                    if (timerRef.current) clearInterval(timerRef.current);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                    />
                  </svg>
                  <span>رجوع</span>
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || countdown <= 0}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-[#C8102E] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#a00d24] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <svg
                        className="h-5 w-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>جاري التحقق...</span>
                    </>
                  ) : (
                    <>
                      <span>تأكيد التوقيع</span>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {/* Resend */}
              <button
                onClick={() => {
                  setStep(1);
                  setOtp(new Array(6).fill(""));
                  setError(null);
                  if (timerRef.current) clearInterval(timerRef.current);
                }}
                className="w-full text-center text-sm text-[#C8102E] transition-colors hover:underline"
              >
                لم تستلم الرمز؟ إعادة الإرسال
              </button>
            </div>
          )}

          {/* ── Step 3: Success ────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5 py-4 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  className="h-8 w-8 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  تم التوقيع بنجاح!
                </h3>
                <p className="mt-1 text-sm text-gray-600">{successMsg}</p>
              </div>

              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">
                  رقم العقد: <span className="font-mono font-medium text-gray-700">{contractId}</span>
                </p>
              </div>

              <button
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C8102E] px-8 py-3 text-sm font-bold text-white transition-all hover:bg-[#a00d24] active:scale-[0.98]"
              >
                <span>إغلاق</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
