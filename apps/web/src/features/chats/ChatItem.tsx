import React from 'react';
import { Conversation } from '../../types';
import { formatChatListTime } from '../../utils/formatters';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Pin, VolumeX, CheckCheck, Check, Image as ImageIcon, FileText } from 'lucide-react';

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
    if (!lastMsg) return <span className="italic opacity-60">No messages yet</span>;
    if (lastMsg.isDeleted) return <span className="italic opacity-60">This message was deleted</span>;
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
  const hasUnread = conversation.unreadCount > 0;

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 px-3 py-[13px] cursor-pointer transition-colors duration-150 select-none relative group ${
        isSelected
          ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
          : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
      }`}
    >
      {/* Active selection indicator */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#00a884] rounded-r-full" />
      )}

      {/* Radix Avatar with Online Dot */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-[49px] h-[49px] border-none">
          {otherUser?.avatarUrl && <AvatarImage src={otherUser.avatarUrl} alt={otherUser.name} />}
          <AvatarFallback className="bg-[#00a884]/15 text-[#00a884] font-semibold text-lg">
            {(otherUser?.name || 'M')[0]}
          </AvatarFallback>
        </Avatar>
        {otherUser?.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full border-2 border-white dark:border-[#111b21]" />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 border-b border-[#e9edef]/60 dark:border-[#2a3942]/60 pb-[13px] -mb-[13px]">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className={`font-normal text-[16.5px] leading-tight truncate ${
            hasUnread
              ? 'text-[#111b21] dark:text-[#e9edef] font-medium'
              : 'text-[#111b21] dark:text-[#e9edef]'
          }`}>
            {otherUser?.name || 'MatrixChat User'}
          </h3>
          <span className={`text-[12px] flex-shrink-0 ml-2 ${
            hasUnread
              ? 'text-[#00a884] font-medium'
              : 'text-[#667781] dark:text-[#8696a0]'
          }`}>
            {formatChatListTime(lastMsg?.createdAt || conversation.lastMessageAt)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[13.5px] text-[#667781] dark:text-[#8696a0] truncate flex items-center gap-1 leading-snug">
            {isSentByMe && lastMsg && !lastMsg.isDeleted && (
              <CheckCheck className="w-[18px] h-[18px] text-[#53bdeb] flex-shrink-0" />
            )}
            <span className="truncate">{getMessagePreview()}</span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 ml-1.5">
            {conversation.isMuted && (
              <VolumeX className="w-4 h-4 text-[#8696a0]" />
            )}
            {conversation.isPinned && (
              <Pin className="w-4 h-4 text-[#8696a0] fill-[#8696a0]" />
            )}
            {hasUnread && (
              <div className="h-[20px] min-w-[20px] px-1 bg-[#00a884] text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                {conversation.unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
