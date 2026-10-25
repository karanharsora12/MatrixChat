import React from 'react';
import { Conversation } from '../../types';
import { formatLastSeen } from '../../utils/formatters';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import {
  ArrowLeft,
  MoreVertical,
  Pin,
  VolumeX,
  Volume2,
  ShieldAlert,
  UserCheck,
  Search,
} from 'lucide-react';

interface ChatHeaderProps {
  conversation: Conversation;
  isTyping: boolean;
  onBack: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onBlockUser: () => void;
  onOpenProfile: () => void;
}

export function ChatHeader({
  conversation,
  isTyping,
  onBack,
  onTogglePin,
  onToggleMute,
  onBlockUser,
  onOpenProfile,
}: ChatHeaderProps) {
  const otherUser = conversation.otherUser;

  const getStatusText = () => {
    if (isTyping) {
      return (
        <span className="text-[#00a884] font-medium">
          <span className="inline-flex items-center gap-[2px]">
            typing
            <span className="typing-dots">
              <span className="dot dot-1">.</span>
              <span className="dot dot-2">.</span>
              <span className="dot dot-3">.</span>
            </span>
          </span>
        </span>
      );
    }
    if (otherUser) {
      const statusText = formatLastSeen(otherUser.isOnline, otherUser.lastSeenAt);
      if (otherUser.isOnline) {
        return <span className="text-[#00a884] font-medium">{statusText}</span>;
      }
      return statusText;
    }
    return '';
  };

  return (
    <div className="h-[60px] px-3 sm:px-4 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef]/50 dark:border-[#2a3942]/50 flex items-center justify-between z-20 flex-shrink-0 select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Back Button */}
        <button
          onClick={onBack}
          className="md:hidden h-9 w-9 -ml-1 rounded-full flex items-center justify-center text-[#54656f] dark:text-[#aebac1] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Contact Avatar & Info */}
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-3 cursor-pointer min-w-0 group"
        >
          <div className="relative">
            <Avatar className="w-[40px] h-[40px] border-none">
              {otherUser?.avatarUrl && <AvatarImage src={otherUser.avatarUrl} alt={otherUser.name} />}
              <AvatarFallback className="bg-[#00a884]/15 text-[#00a884] font-semibold text-sm">
                {(otherUser?.name || 'M')[0]}
              </AvatarFallback>
            </Avatar>
            {otherUser?.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00a884] rounded-full border-2 border-[#f0f2f5] dark:border-[#202c33]" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="font-semibold text-[16px] leading-tight text-[#111b21] dark:text-[#e9edef] truncate group-hover:text-[#00a884] transition-colors duration-200">
              {otherUser?.name || 'MatrixChat User'}
            </h2>
            <p className="text-[12px] text-[#667781] dark:text-[#8696a0] truncate leading-tight mt-0.5">
              {getStatusText()}
            </p>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onTogglePin}
              className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                conversation.isPinned
                  ? 'text-[#00a884] bg-[#00a884]/10'
                  : 'text-[#54656f] dark:text-[#aebac1] hover:bg-black/[0.06] dark:hover:bg-white/[0.06]'
              }`}
            >
              <Pin className="w-[18px] h-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {conversation.isPinned ? 'Unpin chat' : 'Pin chat'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleMute}
              className="h-9 w-9 rounded-full flex items-center justify-center text-[#54656f] dark:text-[#aebac1] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
            >
              {conversation.isMuted ? (
                <VolumeX className="w-[18px] h-[18px] text-red-400" />
              ) : (
                <Volume2 className="w-[18px] h-[18px]" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {conversation.isMuted ? 'Unmute notifications' : 'Mute notifications'}
          </TooltipContent>
        </Tooltip>

        {/* Radix DropdownMenu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 w-9 rounded-full flex items-center justify-center text-[#54656f] dark:text-[#aebac1] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors outline-none">
              <MoreVertical className="w-[18px] h-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl border-border/50">
            <DropdownMenuItem onClick={onOpenProfile} className="gap-2.5 rounded-lg py-2.5">
              <UserCheck className="w-4 h-4" />
              <span>Contact Info</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onTogglePin} className="gap-2.5 rounded-lg py-2.5">
              <Pin className="w-4 h-4" />
              <span>{conversation.isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleMute} className="gap-2.5 rounded-lg py-2.5">
              {conversation.isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{conversation.isMuted ? 'Unmute' : 'Mute'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBlockUser} className="gap-2.5 rounded-lg py-2.5 text-destructive focus:text-destructive">
              <ShieldAlert className="w-4 h-4" />
              <span>Block Contact</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
