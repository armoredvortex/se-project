'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Smartphone, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatINR } from '@/lib/formatters';

interface UpiQrModalProps {
  isOpen: boolean;
  amount: number;
  upiVpa: string;
  shopName: string;
  receiptNo: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const POLL_SECONDS = 90;

export function UpiQrModal({
  isOpen,
  amount,
  upiVpa,
  shopName,
  receiptNo,
  onConfirm,
  onCancel,
}: UpiQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [secondsLeft, setSecondsLeft] = useState(POLL_SECONDS);
  const [expired, setExpired] = useState(false);

  // Build the UPI deep-link URI per NPCI specification
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(shopName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(receiptNo)}`;

  // Render QR onto canvas whenever the modal opens or amount changes
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, upiUri, {
      width: 220,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(() => {/* silent — canvas will just be blank */});
  }, [isOpen, upiUri]);

  // Countdown timer — resets each time the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(POLL_SECONDS);
    setExpired(false);

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const timerPercent = (secondsLeft / POLL_SECONDS) * 100;
  const timerColor =
    secondsLeft > 30 ? 'text-emerald-600' : secondsLeft > 10 ? 'text-amber-500' : 'text-rose-600';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pay via UPI</h2>
              <p className="text-[11px] text-slate-500">Scan with any UPI app</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Cancel payment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR + Info */}
        <div className="px-5 py-4 space-y-4">
          {/* Test mode badge */}
          {/* <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Wifi className="w-3 h-3 text-amber-600" />
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Test / Sandbox Mode
            </span>
          </div> */}

          {/* Amount */}
          <div className="text-center space-y-0.5">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Amount to Collect</p>
            <p className="text-3xl font-extrabold text-slate-900">{formatINR(amount)}</p>
            <p className="text-xs text-slate-500 font-mono">{receiptNo}</p>
          </div>

          {/* QR Canvas */}
          <div className="flex justify-center">
            <div className={`p-2 rounded-xl border-2 transition-colors ${expired ? 'border-rose-300 opacity-40' : 'border-emerald-300'}`}>
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>
          </div>

          {/* UPI VPA */}
          <div className="text-center space-y-0.5">
            <p className="text-[11px] text-slate-400">Paying to</p>
            <p className="text-sm font-bold text-slate-800 font-mono">{upiVpa}</p>
          </div>

          {/* Timer bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {expired ? 'QR expired' : 'QR valid for'}
              </span>
              <span className={`font-bold font-mono ${timerColor}`}>
                {expired ? '0s' : `${secondsLeft}s`}
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  secondsLeft > 30 ? 'bg-emerald-500' : secondsLeft > 10 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>

          {expired && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>QR expired. Cancel and retry to generate a new one.</span>
            </div>
          )}

          {/* Instructions */}
          {!expired && (
            <ol className="text-[11px] text-slate-500 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Open PhonePe, GPay, Paytm or any UPI app</li>
              <li>Tap &ldquo;Scan QR&rdquo; and point camera at the code</li>
              <li>Verify amount and confirm payment</li>
              <li>Click <strong className="text-slate-700">Mark as Paid</strong> below once done</li>
            </ol>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={expired}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark as Paid
          </button>
        </div>
      </div>
    </div>
  );
}
