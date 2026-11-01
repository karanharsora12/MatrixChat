import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { OtpInput } from './OtpInput';
import { Button } from '../../components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import {
  MessageSquare,
  Mail,
  ArrowRight,
  RefreshCw,
  ArrowLeft,
  Lock,
  AlertCircle,
  Edit2,
  CheckCircle2,
  RotateCw,
  Sparkles,
  Sun,
  Moon,
  ShieldCheck,
  QrCode,
  Smartphone,
} from 'lucide-react';

export function LoginPage() {
  const { requestOtp, verifyOtp, verifyTotp } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Mode: 'email' (Email OTP) | 'totp' (Google / Microsoft Authenticator)
  const [authMode, setAuthMode] = useState<'email' | 'totp'>('email');

  // Step: 'input' (enter email) or 'otp' (verify 6-digit email code)
  const [step, setStep] = useState<'input' | 'otp'>('input');

  // Input states
  const [email, setEmail] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);

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

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed || !emailRegex.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestOtp(trimmed);

      const resolved = res.email || res.identifier || trimmed;
      setTargetEmail(resolved);
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
      setError(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify entered Email OTP
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
      setError(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify entered Authenticator App (TOTP) Code
  const handleVerifyTotp = async (codeToVerify?: string) => {
    const finalCode = (codeToVerify || totpCode).trim();
    setError(null);

    const target = (targetEmail || email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!target || !emailRegex.test(target)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (finalCode.length !== 6 || !/^\d{6}$/.test(finalCode)) {
      setError('Please enter all 6 digits of your authenticator code.');
      return;
    }

    try {
      setLoading(true);
      await verifyTotp(target, finalCode);
    } catch (err: any) {
      setError(
        err.message ||
          'Invalid or expired code. Please check your Google or Microsoft Authenticator app.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend Email OTP
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
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#efeae2] dark:bg-[#0c1317] text-foreground relative select-none font-sans overflow-y-auto">
      {/* Top Green Header Banner */}
      <div className="absolute top-0 left-0 right-0 h-48 sm:h-56 bg-[#00a884] dark:bg-[#005c4b] z-0 transition-colors duration-200">
        <div className="max-w-5xl mx-auto h-full px-6 flex items-start justify-between pt-6">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3 text-white">
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-wide uppercase">MatrixChat</span>
          </div>

          {/* Theme Switcher Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle visual theme"
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs shadow-xs"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="text-xs">
              Switch to {theme === 'dark' ? 'Light' : 'Dark'} mode
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Main Center Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[960px] bg-white dark:bg-[#111b21] rounded-2xl shadow-[0_17px_50px_0_rgba(11,20,26,0.19)] border border-black/[0.04] dark:border-white/[0.04] overflow-hidden flex flex-col md:flex-row transition-all duration-200">
          {/* Left Panel: Instructions & Steps */}
          <div className="flex-1 p-8 sm:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-black/[0.06] dark:border-white/[0.06]">
            <div>
              <h1 className="text-2xl sm:text-[28px] font-normal text-[#111b21] dark:text-[#e9edef] leading-tight mb-3">
                Use MatrixChat on your computer
              </h1>
              <p className="text-sm text-[#54656f] dark:text-[#8696a0] leading-relaxed mb-8">
                Instant messaging with zero clutter. Sign in using your email code or your Google
                Authenticator app to start chatting across all your devices.
              </p>

              {/* Numbered Instruction Steps */}
              <ol className="space-y-4 text-sm text-[#3b4a54] dark:text-[#d1d7db]">
                <li className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] text-[#00a884] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Enter your email address to sign in or register.</span>
                </li>
                <li className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] text-[#00a884] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Verify with a one-time email code or <strong>Google Authenticator</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] text-[#00a884] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Keep your conversations, attachments, and profile synced in real time.</span>
                </li>
              </ol>
            </div>

            {/* End-to-End Encryption Notice */}
            <div className="pt-8 mt-6 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center gap-2.5 text-xs text-[#54656f] dark:text-[#8696a0]">
              <Lock className="w-4 h-4 text-[#00a884] shrink-0" />
              <span>End-to-end encrypted. Your personal chats stay private and secure.</span>
            </div>
          </div>

          {/* Right Panel: Interactive Form */}
          <div className="w-full md:w-[420px] p-8 sm:p-10 flex flex-col justify-center bg-[#fafafa] dark:bg-[#202c33]/50">
            {/* Global Error Banner */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 animate-in fade-in-0 duration-200">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug">{error}</div>
              </div>
            )}

            {/* Dev Mode Notification Banner */}
            {devOtpNotice && (
              <button
                type="button"
                onClick={handleFillDevCode}
                className="w-full mb-5 p-3 rounded-xl bg-[#00a884]/10 border border-[#00a884]/30 text-foreground text-xs flex items-center justify-between gap-2 text-left hover:bg-[#00a884]/15 transition group cursor-pointer"
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

            {/* Mode Switcher Tabs (Only shown in input step) */}
            {step === 'input' && (
              <div className="grid grid-cols-2 p-1 bg-black/[0.05] dark:bg-white/[0.05] rounded-xl mb-5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('email');
                    setError(null);
                  }}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    authMode === 'email'
                      ? 'bg-white dark:bg-[#111b21] text-[#00a884] shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('totp');
                    setError(null);
                  }}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    authMode === 'totp'
                      ? 'bg-white dark:bg-[#111b21] text-[#00a884] shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authenticator</span>
                </button>
              </div>
            )}

            {/* ================= FLOW A: AUTHENTICATOR APP (TOTP) ================= */}
            {step === 'input' && authMode === 'totp' ? (
              <div className="space-y-5 animate-in fade-in-0 duration-200">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-[#111b21] dark:text-[#e9edef] flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-[#00a884]" />
                    <span>Authenticator Login</span>
                  </h2>
                  <p className="text-xs text-[#54656f] dark:text-[#8696a0]">
                    Enter the rolling 6-digit code from Google or Microsoft Authenticator.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerifyTotp();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#111b21] dark:text-[#e9edef]">
                      Email Address
                    </label>
                    <div className="flex items-center rounded-xl bg-white dark:bg-[#111b21] border border-black/10 dark:border-white/10 focus-within:border-[#00a884] focus-within:ring-2 focus-within:ring-[#00a884]/20 transition-all px-3.5 py-2.5 shadow-xs">
                      <Mail className="w-4 h-4 text-[#8696a0] mr-2.5 shrink-0" />
                      <input
                        type="email"
                        autoFocus
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-semibold text-[#111b21] dark:text-[#e9edef]">
                      6-Digit Authenticator Code
                    </label>
                    <OtpInput
                      value={totpCode}
                      onChange={setTotpCode}
                      onComplete={(code) => handleVerifyTotp(code)}
                      hasError={!!error}
                      disabled={loading}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !email.trim() || totpCode.length !== 6}
                    className="w-full h-11 text-sm font-semibold rounded-xl bg-[#00a884] text-white hover:bg-[#008069] transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Sign In with Authenticator</span>
                      </>
                    )}
                  </Button>
                </form>
              </div>
            ) : step === 'input' ? (
              /* ================= FLOW B1: EMAIL ENTRY ================= */
              <div className="space-y-5 animate-in fade-in-0 duration-200">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-[#111b21] dark:text-[#e9edef]">
                    Log in with email
                  </h2>
                  <p className="text-xs text-[#54656f] dark:text-[#8696a0]">
                    We will send a 6-digit verification code to your email.
                  </p>
                </div>

                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#111b21] dark:text-[#e9edef]">
                      Email Address
                    </label>
                    <div className="flex items-center rounded-xl bg-white dark:bg-[#111b21] border border-black/10 dark:border-white/10 focus-within:border-[#00a884] focus-within:ring-2 focus-within:ring-[#00a884]/20 transition-all px-3.5 py-2.5 shadow-xs">
                      <Mail className="w-4 h-4 text-[#8696a0] mr-2.5 shrink-0" />
                      <input
                        type="email"
                        autoFocus
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Keep me signed in Checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#54656f] dark:text-[#8696a0]">
                      <input
                        type="checkbox"
                        checked={keepSignedIn}
                        onChange={(e) => setKeepSignedIn(e.target.checked)}
                        className="rounded border-input text-[#00a884] focus:ring-[#00a884] h-4 w-4"
                      />
                      <span>Keep me signed in</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full h-11 text-sm font-semibold rounded-xl bg-[#00a884] text-white hover:bg-[#008069] transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              /* ================= FLOW B2: 6-DIGIT EMAIL OTP VERIFICATION ================= */
              <div className="space-y-5 animate-in fade-in-0 duration-200">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-[#111b21] dark:text-[#e9edef]">
                    Enter security code
                  </h2>
                  <p className="text-xs text-[#54656f] dark:text-[#8696a0]">
                    Enter the 6-digit code sent to:
                  </p>
                </div>

                {/* Recipient Card with Edit Option */}
                <div className="p-3 bg-white dark:bg-[#111b21] rounded-xl border border-black/10 dark:border-white/10 flex items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#00a884]/15 text-[#00a884] flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
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
                    className="text-xs font-semibold text-[#00a884] hover:underline flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-[#00a884]/10 transition cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>

                {/* 6-Digit Individual OTP Input Boxes */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerifyOtp();
                  }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <OtpInput
                      value={otpCode}
                      onChange={setOtpCode}
                      onComplete={(code) => handleVerifyOtp(code)}
                      hasError={!!error}
                      disabled={loading}
                    />
                  </div>

                  {/* Resend Action */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[#54656f] dark:text-[#8696a0]">
                      Didn&apos;t receive code?
                    </span>
                    {resendCooldown > 0 ? (
                      <span className="text-[#54656f] dark:text-[#8696a0] font-medium">
                        Resend in{' '}
                        <span className="font-mono text-[#111b21] dark:text-[#e9edef]">
                          {resendCooldown}s
                        </span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleResend}
                        className="text-[#00a884] hover:underline font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Resend Code</span>
                      </button>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2.5 pt-1">
                    <Button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="w-full h-11 text-sm font-semibold rounded-xl bg-[#00a884] text-white hover:bg-[#008069] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Verifying Code...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify & Continue</span>
                        </>
                      )}
                    </Button>

                    {/* Switch to Authenticator App button */}
                    <button
                      type="button"
                      onClick={() => {
                        setStep('input');
                        setAuthMode('totp');
                        setEmail(targetEmail);
                        setError(null);
                      }}
                      className="w-full py-1.5 text-xs text-[#00a884] hover:underline font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Use Google / Microsoft Authenticator instead</span>
                    </button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setStep('input');
                        setOtpCode('');
                        setError(null);
                        setDevOtpNotice(null);
                      }}
                      className="w-full h-9 rounded-xl text-xs text-[#54656f] dark:text-[#8696a0] hover:text-foreground cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Email Entry</span>
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center text-xs text-[#8696a0] border-t border-black/[0.04] dark:border-white/[0.04]">
        <span>&copy; {new Date().getFullYear()} MatrixChat. All rights reserved.</span>
      </footer>
    </div>
  );
}
