import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  length?: number;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  length = 6,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Array of single-char digits
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  // Focus first input on mount
  useEffect(() => {
    if (!disabled) {
      inputsRef.current[0]?.focus();
    }
  }, [disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) return;

    const newChar = rawVal.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = newChar;
    const combined = newDigits.join('').slice(0, length);
    onChange(combined);

    if (newChar && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    if (combined.length === length && onComplete) {
      onComplete(combined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        // Clear current
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      } else if (index > 0) {
        // Go back and clear previous
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    onChange(pasted);

    // Focus on the next empty or the last input
    const nextIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[nextIndex]?.focus();

    if (pasted.length === length && onComplete) {
      onComplete(pasted);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={digits[index] || ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-bold font-mono rounded-xl bg-[#111b21] border transition-all duration-150 select-none ${
            hasError
              ? 'border-red-500/70 text-red-300 ring-2 ring-red-500/20'
              : digits[index]
              ? 'border-[#00a884] text-[#00a884] ring-2 ring-[#00a884]/20'
              : 'border-[#2a3942] text-white hover:border-[#3b4a54]'
          } focus:outline-none focus:border-[#00a884] focus:ring-2 focus:ring-[#00a884]/25 disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
}
