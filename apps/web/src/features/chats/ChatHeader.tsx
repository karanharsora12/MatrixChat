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
      return <span className="text-[#00a884] font-medium animate-pulse">typing...</span>;
    }
    if (otherUser) {
      return formatLastSeen(otherUser.isOnline, otherUser.lastSeenAt);
    }
    return '';
  };

  return (
    <div className="h-16 px-4 bg-card border-b border-border/50 flex items-center justify-between z-20 flex-shrink-0 select-none">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden h-9 w-9 -ml-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Contact Avatar & Info */}
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-3 cursor-pointer min-w-0 group"
        >
          <Avatar className="w-10 h-10 border border-border">
            {otherUser?.avatarUrl && <AvatarImage src={otherUser.avatarUrl} alt={otherUser.name} />}
            <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
              {(otherUser?.name || 'M')[0]}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <h2 className="font-semibold text-sm text-foreground truncate group-hover:text-[#00a884] transition-colors">
              {otherUser?.name || 'MatrixChat User'}
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {getStatusText()}
            </p>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePin}
              className={`h-9 w-9 text-muted-foreground hover:text-foreground ${
                conversation.isPinned ? 'text-[#00a884] bg-[#00a884]/10' : ''
              }`}
            >
              <Pin className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {conversation.isPinned ? 'Unpin chat' : 'Pin chat'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMute}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              {conversation.isMuted ? (
                <VolumeX className="w-4 h-4 text-destructive" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {conversation.isMuted ? 'Unmute notifications' : 'Mute notifications'}
          </TooltipContent>
        </Tooltip>

        {/* Radix DropdownMenu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onOpenProfile} className="gap-2">
              <UserCheck className="w-4 h-4" />
              <span>Contact Info</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onTogglePin} className="gap-2">
              <Pin className="w-4 h-4" />
              <span>{conversation.isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleMute} className="gap-2">
              {conversation.isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{conversation.isMuted ? 'Unmute' : 'Mute'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBlockUser} className="gap-2 text-destructive focus:text-destructive">
              <ShieldAlert className="w-4 h-4" />
              <span>Block Contact</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
