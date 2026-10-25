import React from 'react';
import { Conversation } from '../../types';
import { formatChatListTime } from '../../utils/formatters';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Pin, VolumeX, CheckCheck, Image as ImageIcon, FileText } from 'lucide-react';

interface ChatItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  currentUserId: string;
}

export function ChatItem({ conversation, isSelected, onSelect, currentUserId }: ChatItemProps) {
  const otherUser = conversation.otherUser;
  const lastMsg = conversation.lastMessage;

  const getMessagePreview = () => {
    if (!lastMsg) return 'No messages yet';
    if (lastMsg.isDeleted) return 'This message was deleted';
    if (lastMsg.messageType === 'image') {
      return (
        <span className="flex items-center gap-1">
          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" /> Photo
        </span>
      );
    }
    if (lastMsg.messageType === 'file') {
      return (
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Document
        </span>
      );
    }
    return lastMsg.content;
  };

  const isSentByMe = lastMsg?.senderId === currentUserId;

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition select-none border-b border-border/40 ${
        isSelected
          ? 'bg-muted/80 dark:bg-card'
          : 'hover:bg-muted/40 dark:hover:bg-card/50'
      }`}
    >
      {/* Radix Avatar with Online Dot */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12 border border-border">
          {otherUser?.avatarUrl && <AvatarImage src={otherUser.avatarUrl} alt={otherUser.name} />}
          <AvatarFallback className="bg-primary/20 text-primary font-semibold text-base">
            {(otherUser?.name || 'M')[0]}
          </AvatarFallback>
        </Avatar>
        {otherUser?.isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#00a884] rounded-full border-2 border-background" />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {otherUser?.name || 'MatrixChat User'}
          </h3>
          <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">
            {formatChatListTime(lastMsg?.createdAt || conversation.lastMessageAt)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
            {isSentByMe && lastMsg && (
              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] flex-shrink-0" />
            )}
            <span className="truncate">{getMessagePreview()}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {conversation.isMuted && (
              <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            {conversation.isPinned && (
              <Pin className="w-3.5 h-3.5 text-muted-foreground fill-current" />
            )}
            {conversation.unreadCount > 0 && (
              <Badge variant="matrix" className="h-4 min-w-[16px] px-1 text-[10px] rounded-full flex items-center justify-center">
                {conversation.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
