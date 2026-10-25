import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../../types';
import { Button } from '../../components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import {
  Paperclip,
  Send,
  X,
  RefreshCw,
  FileText,
  Smile,
  Mic,
} from 'lucide-react';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';

interface MessageComposerProps {
  conversationId: string;
  replyingTo: Message | null;
  onCancelReply: () => void;
  onSendMessage: (content: string, replyToId?: string | null, attachment?: any) => Promise<void>;
}

// Quick popular emojis list for WhatsApp style inline emoji picker
const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🙏', '😊', '🎉', '👏', '✨', '👋'];

export function MessageComposer({
  conversationId,
  replyingTo,
  onCancelReply,
  onSendMessage,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{
    file: File;
    previewUrl?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea smoothly matching WhatsApp
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    socketService.startTyping(conversationId);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(conversationId);
    }, 2000);
  };

  const handleAddEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit.');
      return;
    }

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setAttachmentPreview({ file, previewUrl });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!content.trim() && !attachmentPreview) || isUploading) return;

    try {
      let uploadedAttachment = null;

      if (attachmentPreview) {
        setIsUploading(true);
        const uploadRes = await api.uploadFile(attachmentPreview.file);
        uploadedAttachment = uploadRes.file;
      }

      await onSendMessage(
        content.trim(),
        replyingTo ? replyingTo.id : null,
        uploadedAttachment
      );

      setContent('');
      setAttachmentPreview(null);
      setShowEmojiPicker(false);
      onCancelReply();
      socketService.stopTyping(conversationId);

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = content.trim().length > 0 || attachmentPreview !== null;

  return (
    <div className="bg-[#f0f2f5] dark:bg-[#202c33] border-t border-black/5 dark:border-white/5 px-4 py-2.5 z-20 flex-shrink-0 select-none relative">
      {/* Quick Emojis Bar Popup */}
      {showEmojiPicker && (
        <div className="absolute left-4 bottom-16 bg-white dark:bg-[#233138] border border-border shadow-xl rounded-2xl p-2.5 flex items-center gap-1.5 z-30 animate-in fade-in-0 zoom-in-95">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleAddEmoji(emoji)}
              className="text-xl p-1.5 hover:scale-125 hover:bg-muted/50 rounded-lg transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(false)}
            className="h-7 w-7 rounded-full text-muted-foreground ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Replying Context Bar */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3.5 py-2 mb-2 bg-white/90 dark:bg-[#182229]/90 rounded-xl border-l-4 border-[#00a884] text-xs shadow-sm animate-in fade-in-0 slide-in-from-bottom-2">
          <div className="min-w-0 pr-2">
            <span className="font-semibold text-[#00a884] block mb-0.5">Replying to message</span>
            <p className="text-muted-foreground truncate">{replyingTo.content}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancelReply}
            className="h-6 w-6 rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Attachment Preview Box */}
      {attachmentPreview && (
        <div className="flex items-center justify-between px-3.5 py-2 mb-2 bg-white/90 dark:bg-[#182229]/90 rounded-xl border border-border text-xs shadow-sm animate-in fade-in-0 slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {attachmentPreview.previewUrl ? (
              <img
                src={attachmentPreview.previewUrl}
                alt="Preview"
                className="w-12 h-12 object-cover rounded-lg border border-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                <FileText className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate">{attachmentPreview.file.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(attachmentPreview.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAttachmentPreview(null)}
            className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* WhatsApp Inspired Composer Bar */}
      <div className="flex items-end gap-2.5 max-w-7xl mx-auto">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        />

        {/* Emoji Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full flex-shrink-0 transition-colors"
            >
              <Smile className="w-6 h-6 stroke-[1.6]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Emojis</TooltipContent>
        </Tooltip>

        {/* Attachment Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full flex-shrink-0 transition-colors"
            >
              <Paperclip className="w-5 h-5 stroke-[1.7]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Attach photo or file</TooltipContent>
        </Tooltip>

        {/* Main Text Area Input */}
        <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-3.5 py-2.5 border border-transparent shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] focus-within:ring-1 focus-within:ring-[#00a884] transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-32 leading-5 tracking-wide"
          />
        </div>

        {/* Dynamic Send / Mic Action Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={hasContent ? 'matrix' : 'ghost'}
              size="icon"
              disabled={isUploading}
              onClick={() => (hasContent ? handleSend() : textareaRef.current?.focus())}
              className={`h-10 w-10 rounded-full flex-shrink-0 transition-all ${
                hasContent
                  ? 'bg-[#00a884] text-white hover:bg-[#008069] shadow-md scale-100'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {isUploading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : hasContent ? (
                <Send className="w-4 h-4 fill-current ml-0.5" />
              ) : (
                <Mic className="w-5 h-5 stroke-[1.7]" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{hasContent ? 'Send message (Enter)' : 'Voice note'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
