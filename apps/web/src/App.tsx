import React from 'react';
import { useAuth, AuthProvider } from './hooks/useAuth';
import { LoginPage } from './features/auth/LoginPage';
import { ChatDashboard } from './pages/ChatDashboard';
import { TooltipProvider } from './components/ui/tooltip';
import { MessageSquare, RefreshCw } from 'lucide-react';

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#111b21] text-slate-100">
        <div className="w-16 h-16 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-[#00a884] mb-4 animate-pulse shadow-inner">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white mb-2">
          Matrix<span className="text-[#00a884]">Chat</span>
        </h1>
        <div className="flex items-center gap-2 text-xs text-[#8696a0]">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00a884]" />
          <span>Securing session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <ChatDashboard />;
}

export function App() {
  return (
    <TooltipProvider delayDuration={250}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;
