import React, { useState } from 'react';
import { Message } from '../../types';
import { formatMessageTime, formatFileSize } from '../../utils/formatters';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { Check, CheckCheck, Reply, Trash2, FileText, Download, ChevronDown, Copy, Ban } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
}

export function MessageBubble({ message, isMe, onReply, onDelete }: MessageBubbleProps) {
  const [isImageOpen, setIsImageOpen] = useState(false);

  const renderReceipt = () => {
    if (!isMe) return null;

    const status = message.receipt?.status || 'sent';

    if (status === 'read') {
      return (
        <span title="Read">
          <CheckCheck className="w-4 h-4 text-[#53bdeb] ml-1 shrink-0" />
        </span>
      );
    }
    if (status === 'delivered') {
      return (
        <span title="Delivered">
          <CheckCheck className="w-4 h-4 text-[#8696a0] ml-1 shrink-0" />
        </span>
      );
    }
    return (
      <span title="Sent">
        <Check className="w-4 h-4 text-[#8696a0] ml-1 shrink-0" />
      </span>
    );
  };

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
  };

  if (message.isDeleted) {
    return (
      <div className={`flex w-full my-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-black/5 dark:bg-black/20 text-xs italic text-muted-foreground border border-border/30 select-none shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
          <Ban className="w-3.5 h-3.5 shrink-0" />
          <span>This message was deleted</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full my-1 group relative ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[65%] rounded-lg px-2.5 pt-1.5 pb-1 text-sm shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition-all ${
          isMe
            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none'
            : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none border border-black/5 dark:border-transparent'
        }`}
      >
        {/* Radix Dropdown Action Trigger on hover */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-0.5 rounded bg-black/5 dark:bg-white/10 hover:bg-black/15 text-muted-foreground transition outline-none">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMe ? 'end' : 'start'} className="w-32">
              <DropdownMenuItem onClick={() => onReply(message)} className="gap-2">
                <Reply className="w-3.5 h-3.5" /> Reply
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy} className="gap-2">
                <Copy className="w-3.5 h-3.5" /> Copy
              </DropdownMenuItem>
              {isMe && (
                <DropdownMenuItem
                  onClick={() => onDelete(message.id)}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Replying-To Context Banner */}
        {message.replyTo && (
          <div className="mb-1.5 p-2 rounded-lg bg-black/5 dark:bg-black/25 border-l-4 border-[#00a884] text-xs">
            <p className="font-semibold text-[#00a884] text-[11px] mb-0.5">
              {message.replyTo.senderId === message.senderId ? 'You' : 'Participant'}
            </p>
            <p className="text-muted-foreground truncate">{message.replyTo.content}</p>
          </div>
        )}

        {/* Attachment Display */}
        {message.attachment && (
          <div className="mb-1.5">
            {message.attachment.mimeType.startsWith('image/') ? (
              <>
                <div
                  onClick={() => setIsImageOpen(true)}
                  className="rounded-lg overflow-hidden border border-black/10 dark:border-white/10 max-w-sm cursor-pointer hover:opacity-95 transition"
                >
                  <img
                    src={message.attachment.filePath}
                    alt={message.attachment.fileName}
                    className="w-full max-h-72 object-cover"
                  />
                </div>

                <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
                  <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
                    <img
                      src={message.attachment.filePath}
                      alt={message.attachment.fileName}
                      className="w-full max-h-[80vh] object-contain rounded-lg"
                    />
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <a
                href={message.attachment.filePath}
                download={message.attachment.fileName}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-2 rounded-lg bg-black/5 dark:bg-black/20 hover:bg-black/10 transition text-inherit no-underline"
              >
                <div className="w-10 h-10 rounded-lg bg-[#00a884]/20 flex items-center justify-center text-[#00a884] flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs truncate">{message.attachment.fileName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(message.attachment.fileSize)}
                  </p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </a>
            )}
          </div>
        )}

        {/* Message Content & Timestamp */}
        <div className="relative flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          {message.content && (
            <span className="break-words whitespace-pre-wrap leading-[19px] text-[14.2px] select-text">
              {message.content}
            </span>
          )}

          {/* Timestamp and Receipt Indicator */}
          <div className="inline-flex items-center gap-0.5 ml-auto text-[11px] text-[#667781] dark:text-[#8696a0] select-none shrink-0 self-end">
            <span>{formatMessageTime(message.createdAt)}</span>
            {renderReceipt()}
          </div>
        </div>
      </div>
    </div>
  );
}
