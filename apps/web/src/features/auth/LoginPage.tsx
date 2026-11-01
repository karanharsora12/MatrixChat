import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { OtpInput } from './OtpInput';
import {
  Mail,
  ArrowRight,
  RefreshCw,
  ArrowLeft,
  MessageSquare,
  Lock,
  AlertCircle,
  Edit2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export function LoginPage() {
  const { requestOtp, verifyOtp } = useAuth();

  // Step state: 'input' (enter email) or 'otp' (verify 6-digit code)
  const [step, setStep] = useState<'input' | 'otp'>('input');

  // Input states
  const [email, setEmail] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Interaction states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Request OTP verification code
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setDevOtpNotice(null);
    setDevCode(null);

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestOtp(trimmedEmail);

      const resolvedEmail = res.email || res.identifier || trimmedEmail;
      setTargetEmail(resolvedEmail);
      setResendCooldown(res.resendAfter || 60);
      setOtpCode('');
      setStep('otp');

      if (res.devCode) {
        setDevCode(res.devCode);
        setDevOtpNotice(`Dev code: ${res.devCode} (Click to auto-fill)`);
      } else if (res.isDev) {
        setDevOtpNotice('Development mode: check server terminal log for verification code.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify entered OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const finalCode = (codeToVerify || otpCode).trim();
    setError(null);

    if (finalCode.length !== 6 || !/^\d{6}$/.test(finalCode)) {
      setError('Please enter all 6 numeric digits of your verification code.');
      return;
    }

    try {
      setLoading(true);
      await verifyOtp({
        email: targetEmail,
        otp: finalCode,
      });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    try {
      setLoading(true);
      const res = await requestOtp(targetEmail);

      setResendCooldown(res.resendAfter || 60);
      setOtpCode('');
      if (res.devCode) {
        setDevCode(res.devCode);
        setDevOtpNotice(`Fresh dev code: ${res.devCode} (Click to auto-fill)`);
      } else if (res.isDev) {
        setDevOtpNotice('Fresh code dispatched: check server terminal log.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to resend verification code right now.');
    } finally {
      setLoading(false);
    }
  };

  // One-click dev code fill
  const handleFillDevCode = () => {
    if (devCode) {
      setOtpCode(devCode);
      handleVerifyOtp(devCode);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#111b21] p-4 text-slate-100 relative overflow-hidden select-none">
      {/* WhatsApp Emerald Glow Ambient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-72 bg-[#00a884] opacity-15 filter blur-[100px] pointer-events-none" />

      {/* Main Auth Container Card */}
      <div className="w-full max-w-[440px] bg-[#202c33] rounded-2xl shadow-2xl border border-[#2a3942] p-6 sm:p-8 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#00a884]/15 border border-[#00a884]/30 flex items-center justify-center text-[#00a884] mb-3 shadow-[0_0_20px_rgba(0,168,132,0.25)]">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
            Matrix<span className="text-[#00a884]">Chat</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#8696a0] mt-1 text-center">
            {step === 'input'
              ? 'Enter your email to receive a secure login code'
              : 'Enter the 6-digit code sent to your inbox'}
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{error}</div>
          </div>
        )}

        {/* Dev Mode Notification Banner */}
        {devOtpNotice && (
          <button
            type="button"
            onClick={handleFillDevCode}
            className="w-full mb-5 p-3 rounded-xl bg-emerald-950/70 border border-[#00a884]/40 text-emerald-200 text-xs flex items-center justify-between gap-2 text-left hover:bg-emerald-900/60 transition group cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-[#00a884] shrink-0" />
              <span className="truncate">{devOtpNotice}</span>
            </div>
            {devCode && (
              <span className="text-[11px] font-semibold text-[#00a884] bg-[#00a884]/15 px-2 py-0.5 rounded-md border border-[#00a884]/30 group-hover:bg-[#00a884]/25 shrink-0">
                Autofill
              </span>
            )}
          </button>
        )}

        {/* ================= STEP 1: EMAIL INPUT ================= */}
        {step === 'input' ? (
          <div>
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="flex items-center rounded-xl overflow-hidden border border-[#2a3942] focus-within:border-[#00a884] focus-within:ring-2 focus-within:ring-[#00a884]/20 transition bg-[#111b21] px-3.5 py-3">
                  <Mail className="w-4 h-4 text-[#8696a0] mr-2.5 shrink-0" />
                  <input
                    type="email"
                    autoFocus
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-transparent text-white placeholder-[#8696a0] focus:outline-none text-sm"
                  />
                </div>
                <p className="text-[11px] text-[#8696a0] mt-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00a884] shrink-0" />
                  <span>No password needed. We will email you a secure 6-digit code.</span>
                </p>
              </div>

              <Button
                type="submit"
                variant="matrix"
                disabled={loading || !email.trim()}
                className="w-full h-11 text-xs sm:text-sm font-semibold rounded-xl mt-4 flex items-center justify-center gap-2 shadow-lg shadow-[#00a884]/15"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        ) : (
          /* ================= STEP 2: OTP VERIFICATION ================= */
          <div className="space-y-6">
            {/* Target Display Card with Change Email Button */}
            <div className="p-3 bg-[#111b21] rounded-xl border border-[#2a3942] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#00a884]/15 text-[#00a884] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-[#8696a0]">Code sent to</div>
                  <div className="text-xs sm:text-sm font-medium text-white truncate">
                    {targetEmail}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setOtpCode('');
                  setError(null);
                  setDevOtpNotice(null);
                }}
                className="text-xs font-semibold text-[#00a884] hover:text-[#00c99e] flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg hover:bg-[#00a884]/10 transition"
              >
                <Edit2 className="w-3 h-3" />
                <span>Change</span>
              </button>
            </div>

            {/* 6-Digit OTP Box Grid */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyOtp();
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider mb-3 text-center">
                  Enter 6-Digit Verification Code
                </label>
                <OtpInput
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={(completedCode) => {
                    handleVerifyOtp(completedCode);
                  }}
                  hasError={!!error}
                  disabled={loading}
                />
              </div>

              {/* Verify Button */}
              <Button
                type="submit"
                variant="matrix"
                disabled={loading || otpCode.length !== 6}
                className="w-full h-11 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#00a884]/15"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Continue</span>
                  </>
                )}
              </Button>

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('input');
                    setOtpCode('');
                    setError(null);
                    setDevOtpNotice(null);
                  }}
                  className="text-[#8696a0] hover:text-white flex items-center gap-1 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <div className="text-right">
                  {resendCooldown > 0 ? (
                    <span className="text-[#8696a0]">
                      Resend in <span className="text-white font-mono font-medium">{resendCooldown}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleResend}
                      className="text-[#00a884] hover:text-[#00c99e] hover:underline font-semibold transition"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Security & Encryption Notice */}
        <div className="mt-8 pt-5 border-t border-[#2a3942] flex items-center justify-center gap-2 text-[11px] text-[#8696a0]">
          <Lock className="w-3 h-3 text-[#00a884] shrink-0" />
          <span>Protected with end-to-end security and HTTP-only session tokens.</span>
        </div>
      </div>
    </div>
  );
}
