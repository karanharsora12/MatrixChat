import React from 'react';
import { MessageSquare, Lock, Sparkles } from 'lucide-react';

export function EmptyChatState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f0f2f5] dark:bg-[#111b21] select-none text-center relative overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #00a884 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Decorative floating circles */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#00a884]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-[#00a884]/5 blur-3xl pointer-events-none" />

      {/* Main icon */}
      <div className="relative mb-8">
        <div className="w-[88px] h-[88px] rounded-full bg-[#00a884]/[0.08] flex items-center justify-center text-[#00a884]">
          <MessageSquare className="w-11 h-11 stroke-[1.3]" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-[#00a884]/15 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-[#00a884]" />
        </div>
      </div>

      <h1 className="text-[28px] font-light text-[#41525d] dark:text-[#e9edef] mb-2 tracking-tight">
        Matrix<span className="font-semibold text-[#00a884]">Chat</span>
        <span className="text-base font-normal text-[#8696a0] ml-2">Web</span>
      </h1>

      <p className="text-[14px] text-[#667781] dark:text-[#8696a0] max-w-md leading-relaxed mb-10">
        Send and receive messages without keeping your phone online.
        Use MatrixChat on up to 4 linked devices and 1 phone at the same time.
      </p>

      {/* Bottom bar */}
      <div className="absolute bottom-6 flex items-center gap-1.5 text-[12px] text-[#8696a0]">
        <Lock className="w-3 h-3 text-[#8696a0]" />
        <span>Your personal messages are end-to-end encrypted</span>
      </div>

      {/* Signature green bottom strip */}
      <div className="absolute bottom-0 inset-x-0 h-[6px] bg-[#00a884]" />
    </div>
  );
}
