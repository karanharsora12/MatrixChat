import React, { useState } from 'react';
import { Message } from '../../types';
import { formatMessageTime, formatFileSize } from '../../utils/formatters';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { modal } from '../../components/ui/modal';
import {
  Check,
  CheckCheck,
  Reply,
  Trash2,
  FileText,
  Download,
  ChevronDown,
  Copy,
  Ban,
  Forward,
  Star,
  Play,
  Pause,
  Mic,
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  showTail?: boolean;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onScrollToMessage?: (messageId: string) => void;
}

// Detect if a message is only emoji (1-5 emojis, no other text)
function isEmojiOnly(text: string): boolean {
  if (!text) return false;
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F){1,5}$/u;
  return emojiRegex.test(text.trim());
}

// WhatsApp rich text formatting: *bold*, _italic_, ~strikethrough~, `code`, and URLs
function formatWhatsAppText(text: string): React.ReactNode[] {
  if (!text) return [];

  const tokenRegex = /(https?:\/\/[^\s]+|\*[^*]+\*|_[^_]+_|~[^~]+~|`[^`]+`)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[#027eb5] dark:text-[#53bdeb] underline hover:opacity-80 break-all select-text cursor-pointer"
        >
          {part}
        </a>
      );
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <strong key={index} className="font-semibold">{part.slice(1, -1)}</strong>;
    }

    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return <em key={index} className="italic">{part.slice(1, -1)}</em>;
    }

    if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
      return <del key={index} className="line-through opacity-80">{part.slice(1, -1)}</del>;
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={index}
          className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-[13px] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export function MessageBubble({
  message,
  isMe,
  showTail = true,
  onReply,
  onDelete,
  onScrollToMessage,
}: MessageBubbleProps) {
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const emojiOnly = message.content && !message.attachment && isEmojiOnly(message.content);
  const isAudio =
    message.attachment?.mimeType?.startsWith('audio/') ||
    (message.messageType === 'file' && message.attachment?.fileName?.endsWith('.mp3'));

  const renderReceipt = (forceLight = false) => {
    if (!isMe) return null;

    const status = message.receipt?.status || 'sent';

    if (status === 'read') {
      return (
        <span title="Read" className="inline-flex">
          <CheckCheck className="w-[16px] h-[16px] text-[#53bdeb] ml-1 shrink-0" />
        </span>
      );
    }
    if (status === 'delivered') {
      return (
        <span title="Delivered" className="inline-flex">
          <CheckCheck
            className={`w-[16px] h-[16px] ${forceLight ? 'text-white/80' : 'text-[#8696a0]'} ml-1 shrink-0`}
          />
        </span>
      );
    }
    return (
      <span title="Sent" className="inline-flex">
        <Check
          className={`w-[16px] h-[16px] ${forceLight ? 'text-white/80' : 'text-[#8696a0]'} ml-1 shrink-0`}
        />
      </span>
    );
  };

  const handleCopy = async () => {
    if (message.content) {
      await navigator.clipboard.writeText(message.content);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleDelete = async () => {
    const confirmed = await modal.confirm({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      confirmText: 'Delete for everyone',
      cancelText: 'Cancel',
      variant: 'destructive',
      type: 'warning',
    });

    if (confirmed) {
      onDelete(message.id);
    }
  };

  // WhatsApp-style stable context dropdown menu
  const renderContextMenu = (align: 'start' | 'end') => (
    <DropdownMenuContent
      align={align}
      side="bottom"
      sideOffset={4}
      className="w-40 rounded-xl shadow-xl border border-black/10 dark:border-white/10 p-1 bg-white dark:bg-[#233138] z-50 animate-in fade-in-0 zoom-in-95 duration-100"
    >
      <DropdownMenuItem
        onClick={() => onReply(message)}
        className="gap-3 rounded-lg py-2 px-3 text-[13.5px] cursor-pointer"
      >
        <Reply className="w-4 h-4 text-[#54656f] dark:text-[#8696a0]" /> Reply
      </DropdownMenuItem>

      {message.content && (
        <DropdownMenuItem
          onClick={handleCopy}
          className="gap-3 rounded-lg py-2 px-3 text-[13.5px] cursor-pointer"
        >
          <Copy className="w-4 h-4 text-[#54656f] dark:text-[#8696a0]" />
          {copyFeedback ? 'Copied!' : 'Copy'}
        </DropdownMenuItem>
      )}

      <DropdownMenuItem
        onClick={() => setIsStarred(!isStarred)}
        className="gap-3 rounded-lg py-2 px-3 text-[13.5px] cursor-pointer"
      >
        <Star
          className={`w-4 h-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-[#54656f] dark:text-[#8696a0]'}`}
        />
        {isStarred ? 'Unstar' : 'Star'}
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={() => {
          modal.info('Message forward modal ready for contacts integration.', 'Forward');
        }}
        className="gap-3 rounded-lg py-2 px-3 text-[13.5px] cursor-pointer"
      >
        <Forward className="w-4 h-4 text-[#54656f] dark:text-[#8696a0]" /> Forward
      </DropdownMenuItem>

      {isMe && (
        <>
          <DropdownMenuSeparator className="my-1 bg-black/[0.06] dark:bg-white/[0.06]" />
          <DropdownMenuItem
            onClick={handleDelete}
            className="gap-3 rounded-lg py-2 px-3 text-[13.5px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-red-500 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );

  // Deleted message
  if (message.isDeleted) {
    return (
      <div className={`flex w-full my-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] bg-white/70 dark:bg-[#182229]/70 text-[13px] italic text-[#8696a0] select-none shadow-[0_1px_0.5px_rgba(11,20,26,0.08)] backdrop-blur-sm">
          <Ban className="w-3.5 h-3.5 shrink-0 opacity-50" />
          <span>This message was deleted</span>
        </div>
      </div>
    );
  }

  // Emoji-only message
  if (emojiOnly) {
    return (
      <div
        id={`msg-${message.id}`}
        className={`flex w-full my-1.5 group relative ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in-0 duration-150`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={() => onReply(message)}
      >
        <div className="relative">
          {/* Stable Hover action menu */}
          <div
            className={`absolute -top-2 ${isMe ? '-left-8' : '-right-8'} z-20 transition-opacity duration-150 ${
              isHovered || isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded-full bg-white dark:bg-[#233138] shadow-md border border-border/30 text-[#54656f] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] transition-colors outline-none"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              {renderContextMenu(isMe ? 'end' : 'start')}
            </DropdownMenu>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-5xl leading-tight select-text cursor-default drop-shadow-sm hover:scale-105 transition-transform duration-150">
              {message.content}
            </span>
            <div className="inline-flex items-center gap-0.5 text-[11px] text-[#667781] dark:text-[#8696a0] select-none shrink-0 mt-0.5">
              <span>{formatMessageTime(message.createdAt)}</span>
              {isStarred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 ml-0.5" />}
              {renderReceipt()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isImageAttachment = message.attachment && message.attachment.mimeType.startsWith('image/');
  const isImageOnly = isImageAttachment && !message.content;

  return (
    <div
      id={`msg-${message.id}`}
      className={`flex w-full ${showTail ? 'mt-2 mb-0.5' : 'my-[1.5px]'} group relative ${
        isMe ? 'justify-end' : 'justify-start'
      } animate-in fade-in-0 duration-150`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={() => onReply(message)}
    >
      {/* Bubble Container with consistent 8px radius */}
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] lg:max-w-[60%] text-[14.2px] leading-[20px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
          isMe
            ? `bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-[8px] ${
                showTail ? 'rounded-tr-none' : ''
              }`
            : `bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-[8px] ${
                showTail ? 'rounded-tl-none' : ''
              }`
        }`}
      >
        {/* WhatsApp-style bubble tail */}
        {showTail &&
          (isMe ? (
            <svg
              className="absolute -right-[8px] top-0 w-2 h-[13px] pointer-events-none"
              viewBox="0 0 8 13"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.188 0H0v11.193c.035-.07.076-.14.123-.21L5.188 0z"
                className="fill-[#d9fdd3] dark:fill-[#005c4b]"
              />
              <path
                d="M6.575 1.88C3.857 7.737 1.632 9.885.067 10.884c-.054.034-.076.073-.067.117l.012.042C1.753 9.085 3.96 5.922 6.937 1.272A.477.477 0 0 0 7 1.047c-.063-.176-.22-.3-.425-.3a.437.437 0 0 0-.1.012L8 0 5.188 0l1.387 1.88z"
                className="fill-[#d9fdd3] dark:fill-[#005c4b]"
              />
            </svg>
          ) : (
            <svg
              className="absolute -left-[8px] top-0 w-2 h-[13px] scale-x-[-1] pointer-events-none"
              viewBox="0 0 8 13"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.188 0H0v11.193c.035-.07.076-.14.123-.21L5.188 0z"
                className="fill-white dark:fill-[#202c33]"
              />
              <path
                d="M6.575 1.88C3.857 7.737 1.632 9.885.067 10.884c-.054.034-.076.073-.067.117l.012.042C1.753 9.085 3.96 5.922 6.937 1.272A.477.477 0 0 0 7 1.047c-.063-.176-.22-.3-.425-.3a.437.437 0 0 0-.1.012L8 0 5.188 0l1.387 1.88z"
                className="fill-white dark:fill-[#202c33]"
              />
            </svg>
          ))}

        {/* Stable Hover Action Menu */}
        <div
          className={`absolute top-1 right-1.5 z-20 transition-opacity duration-150 ${
            isHovered || isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors outline-none ${
                  isMe
                    ? 'hover:bg-black/10 dark:hover:bg-white/10 text-[#667781] dark:text-[#8696a0]'
                    : 'hover:bg-black/10 dark:hover:bg-white/10 text-[#667781] dark:text-[#8696a0]'
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            {renderContextMenu(isMe ? 'end' : 'start')}
          </DropdownMenu>
        </div>

        {/* Replying-To Context Banner */}
        {message.replyTo && (
          <div
            onClick={() => onScrollToMessage?.(message.replyTo!.id)}
            className="mx-1 mt-1 p-2 rounded-[6px] bg-black/[0.05] dark:bg-black/20 border-l-[3.5px] border-[#00a884] cursor-pointer hover:bg-black/[0.08] dark:hover:bg-black/30 transition-colors"
          >
            <p className="font-semibold text-[#00a884] text-[11px] mb-0.5 leading-none">
              {message.replyTo.senderId === message.senderId ? 'You' : 'Contact'}
            </p>
            <p className="text-[#667781] dark:text-[#8696a0] text-[12px] truncate leading-tight">
              {message.replyTo.content}
            </p>
          </div>
        )}

        {/* Attachment Display */}
        {message.attachment && (
          <div>
            {isImageAttachment ? (
              <div className="relative group/img overflow-hidden">
                <div
                  onClick={() => setIsImageOpen(true)}
                  className={`cursor-pointer ${isImageOnly ? 'rounded-[8px]' : 'rounded-t-[8px]'}`}
                >
                  <img
                    src={message.attachment.filePath}
                    alt={message.attachment.fileName}
                    className="w-full max-h-[350px] object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 bg-black/60 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm">
                      Click to view
                    </div>
                  </div>
                </div>

                {isImageOnly && (
                  <div className="absolute bottom-1.5 right-1.5 bg-black/45 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[11px] flex items-center gap-0.5 select-none z-10">
                    <span>{formatMessageTime(message.createdAt)}</span>
                    {isStarred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 ml-0.5" />}
                    {renderReceipt(true)}
                  </div>
                )}

                <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
                  <DialogContent className="max-w-4xl p-2 bg-black/90 border-none backdrop-blur-2xl">
                    <div className="flex flex-col items-center justify-center">
                      <img
                        src={message.attachment.filePath}
                        alt={message.attachment.fileName}
                        className="w-full max-h-[82vh] object-contain rounded-lg"
                      />
                      <div className="flex items-center justify-between w-full mt-2 px-2 text-white/80 text-xs">
                        <span>{message.attachment.fileName}</span>
                        <a
                          href={message.attachment.filePath}
                          download={message.attachment.fileName}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          <Download className="w-4 h-4" /> Download
                        </a>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : isAudio ? (
              <div className="p-2.5 flex items-center gap-3 min-w-[260px] sm:min-w-[300px]">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                    <Mic className="w-5 h-5" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center hover:bg-[#008069] transition-all shrink-0 shadow-sm active:scale-95"
                >
                  {isPlayingAudio ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[2px] h-6 py-1">
                    {[12, 18, 8, 22, 14, 26, 16, 20, 10, 24, 18, 14, 28, 12, 16, 20, 8, 18].map(
                      (h, idx) => (
                        <div
                          key={idx}
                          style={{ height: `${h}px` }}
                          className={`w-[3px] rounded-full transition-all duration-200 ${
                            isPlayingAudio && idx < 10
                              ? 'bg-[#00a884]'
                              : isPlayingAudio
                              ? 'bg-[#8696a0]/60'
                              : 'bg-[#8696a0]/40 hover:bg-[#00a884]'
                          }`}
                        />
                      )
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#667781] dark:text-[#8696a0] mt-0.5">
                    <span>{isPlayingAudio ? '0:06' : '0:14'}</span>
                    <span>Voice message</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="m-1">
                <a
                  href={message.attachment.filePath}
                  download={message.attachment.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-[8px] bg-black/[0.04] dark:bg-black/15 hover:bg-black/[0.08] dark:hover:bg-black/25 transition-all text-inherit no-underline group/file"
                >
                  <div className="w-10 h-10 rounded-[8px] bg-[#00a884]/15 flex items-center justify-center text-[#00a884] shrink-0 group-hover/file:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[13px] truncate">{message.attachment.fileName}</p>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">
                      {formatFileSize(message.attachment.fileSize)}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#00a884]/10 flex items-center justify-center text-[#00a884] opacity-60 group-hover/file:opacity-100 transition-opacity shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Message Text Content & Inline Timestamp */}
        {(!isImageOnly || !message.attachment) && (
          <div className="relative px-3 pt-[6px] pb-[7px] pr-8">
            <div className="flex flex-wrap items-end gap-x-2.5 gap-y-0.5">
              {message.content && (
                <span className="break-words whitespace-pre-wrap leading-[19px] text-[14.2px] select-text">
                  {formatWhatsAppText(message.content)}
                </span>
              )}

              <span className="inline-flex items-center gap-0.5 ml-auto text-[11px] text-[#667781] dark:text-[#8696a0] select-none shrink-0 self-end translate-y-[2px]">
                <span>{formatMessageTime(message.createdAt)}</span>
                {isStarred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 ml-0.5" />}
                {renderReceipt()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
