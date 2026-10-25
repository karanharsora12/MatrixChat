import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { COUNTRIES, CountryCode } from '../../utils/countries';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Combobox, ComboboxItem } from '../../components/ui/combobox';
import {
  ShieldCheck,
  Phone,
  ArrowRight,
  RefreshCw,
  ArrowLeft,
  MessageSquare,
  Lock,
  AlertCircle,
  Info,
  Globe,
} from 'lucide-react';

export function LoginPage() {
  const { requestOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRIES[0]);
  const [nationalNumber, setNationalNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [fullPhone, setFullPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  const countryItems = useMemo(
    () =>
      COUNTRIES.map((c) => ({
        value: c.code,
        label: `${c.name} (${c.dialCode})`,
        icon: <Globe className="w-4 h-4 text-muted-foreground shrink-0" />,
      })),
    []
  );

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDevOtpNotice(null);

    const cleaned = nationalNumber.replace(/\D/g, '');
    if (cleaned.length < 7 || cleaned.length > 15) {
      setError('Please enter a valid phone number (7 to 15 digits).');
      return;
    }

    try {
      setLoading(true);
      const res = await requestOtp(cleaned, selectedCountry.dialCode);
      setFullPhone(res.phoneNumber);
      setResendCooldown(res.resendAfter || 60);
      setStep('otp');
      if (res.isDev) {
        setDevOtpNotice('Development mode active: check your terminal log for the verification SMS.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      setError('Please enter all 6 numeric digits of your verification code.');
      return;
    }

    try {
      setLoading(true);
      await verifyOtp(fullPhone, otpCode);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    try {
      setLoading(true);
      const res = await requestOtp(nationalNumber, selectedCountry.dialCode);
      setResendCooldown(res.resendAfter || 60);
      if (res.isDev) {
        setDevOtpNotice('Fresh code sent: check terminal log.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to resend verification code right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#111b21] p-4 text-slate-100 relative overflow-hidden">
      {/* Background Matrix/WhatsApp Accent Glow */}
      <div className="absolute top-0 left-0 right-0 h-56 bg-[#00a884] opacity-20 filter blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-[#202c33] rounded-2xl shadow-2xl border border-[#2a3942] p-8 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-[#00a884] mb-3 shadow-inner">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Matrix<span className="text-[#00a884]">Chat</span>
          </h1>
          <p className="text-sm text-[#8696a0] mt-1 text-center">
            {step === 'phone'
              ? 'Enter your mobile number to sign in or get started.'
              : `Enter the 6-digit code sent to ${fullPhone}`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-950/50 border border-red-500/40 text-red-200 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Dev Mode Banner */}
        {devOtpNotice && (
          <div className="mb-6 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{devOtpNotice}</div>
          </div>
        )}

        {/* Step 1: Phone Entry */}
        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#8696a0] uppercase tracking-wider mb-2">
                Country / Region (Searchable)
              </label>
              <Combobox
                items={countryItems}
                value={selectedCountry.code}
                onChange={(code) => {
                  const country = COUNTRIES.find((c) => c.code === code);
                  if (country) setSelectedCountry(country);
                }}
                searchPlaceholder="Search country or code (e.g. +1, India)..."
                placeholder="Select country..."
                className="w-[384px] max-w-[calc(100vw-4rem)] bg-[#202c33] border-[#2a3942]"
                triggerClassName="w-full h-12 bg-[#111b21] border-[#2a3942] text-white hover:bg-[#182229] hover:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8696a0] uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <div className="flex rounded-xl overflow-hidden border border-[#2a3942] focus-within:border-[#00a884] focus-within:ring-1 focus-within:ring-[#00a884] transition bg-[#111b21]">
                <div className="px-4 py-3 text-[#00a884] font-medium bg-[#111b21] border-r border-[#2a3942] text-sm select-none flex items-center">
                  {selectedCountry.dialCode}
                </div>
                <input
                  type="tel"
                  autoFocus
                  placeholder="e.g. 555-0101"
                  value={nationalNumber}
                  onChange={(e) => setNationalNumber(e.target.value)}
                  className="flex-1 px-4 py-3 bg-transparent text-white placeholder-[#8696a0] focus:outline-none text-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="matrix"
              disabled={loading || !nationalNumber.trim()}
              className="w-full h-12 text-sm font-semibold rounded-xl mt-2"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>
        ) : (
          /* Step 2: OTP Entry */
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-[#8696a0] uppercase tracking-wider mb-3 text-center">
                6-Digit Verification Code
              </label>
              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-48 text-center text-3xl tracking-[0.5em] font-mono px-3 py-3 rounded-xl bg-[#111b21] border border-[#2a3942] text-white focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition placeholder-[#8696a0]"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="matrix"
              disabled={loading || otpCode.length !== 6}
              className="w-full h-12 text-sm font-semibold rounded-xl"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
            </Button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtpCode('');
                  setError(null);
                }}
                className="text-[#8696a0] hover:text-white flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Number</span>
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={handleResend}
                className="text-[#00a884] hover:underline disabled:opacity-50 disabled:no-underline transition font-medium"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        {/* Security Footer Notice */}
        <div className="mt-8 pt-6 border-t border-[#2a3942] flex items-center justify-center gap-2 text-xs text-[#8696a0]">
          <Lock className="w-3.5 h-3.5 text-[#00a884]" />
          <span>Secured with HTTP-only cookies and mobile authentication.</span>
        </div>
      </div>
    </div>
  );
}
