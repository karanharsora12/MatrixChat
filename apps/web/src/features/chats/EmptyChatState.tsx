import React from 'react';
import { MessageSquare, Lock } from 'lucide-react';

export function EmptyChatState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f0f2f5] dark:bg-[#111b21] border-b-8 border-[#00a884] select-none text-center">
      <div className="w-20 h-20 rounded-full bg-[#00a884]/10 dark:bg-[#00a884]/20 border border-[#00a884]/30 flex items-center justify-center text-[#00a884] mb-6 shadow-inner">
        <MessageSquare className="w-10 h-10" />
      </div>

      <h1 className="text-3xl font-light text-slate-800 dark:text-slate-100 mb-3 tracking-wide">
        Matrix<span className="font-semibold text-[#00a884]">Chat</span> for Web
      </h1>

      <p className="text-sm text-chat-mutedLight dark:text-chat-mutedDark max-w-md leading-relaxed mb-8">
        Send and receive real-time messages, share documents, and stay connected seamlessly. Select a chat from the sidebar or start a new conversation.
      </p>

      <div className="flex items-center gap-2 text-xs text-chat-mutedLight dark:text-chat-mutedDark">
        <Lock className="w-3.5 h-3.5 text-[#00a884]" />
        <span>Secured with mobile number authentication and PostgreSQL persistence.</span>
      </div>
    </div>
  );
}
