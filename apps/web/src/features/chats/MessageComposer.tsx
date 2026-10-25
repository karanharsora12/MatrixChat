import React, { useState, useRef, useEffect } from "react";
import { Message } from "../../types";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../../components/ui/tooltip";
import {
  Paperclip,
  X,
  RefreshCw,
  FileText,
  Smile,
  Image as ImageIcon,
  FileUp,
} from "lucide-react";
import { api } from "../../services/api";
import { socketService } from "../../services/socket";
import { EmojiPicker } from "../../components/emoji";
import { modal } from "../../components/ui/modal";

interface MessageComposerProps {
  conversationId: string;
  replyingTo: Message | null;
  onCancelReply: () => void;
  onSendMessage: (
    content: string,
    replyToId?: string | null,
    attachment?: any,
    messageType?: "text" | "image" | "file",
  ) => Promise<void>;
}

export function MessageComposer({
  conversationId,
  replyingTo,
  onCancelReply,
  onSendMessage,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const [attachmentPreview, setAttachmentPreview] = useState<{
    file: File;
    previewUrl?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
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

  // Cursor-aware emoji insertion
  const handleAddEmoji = (emoji: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart ?? content.length;
      const end = textarea.selectionEnd ?? content.length;
      const nextContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(nextContent);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setContent((prev) => prev + emoji);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      modal.warning("File size exceeds the 15MB limit.", "File Too Large");
      return;
    }

    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined;
    setAttachmentPreview({ file, previewUrl });
    setShowAttachmentMenu(false);
    if (e.target) e.target.value = "";
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!content.trim() && !attachmentPreview) || isUploading) return;

    try {
      let uploadedAttachment = null;
      let messageType: "text" | "image" | "file" = "text";

      if (attachmentPreview) {
        setIsUploading(true);
        const uploadRes = await api.uploadFile(attachmentPreview.file);
        uploadedAttachment = uploadRes.file;
        messageType = attachmentPreview.file.type.startsWith("image/")
          ? "image"
          : "file";
      }

      await onSendMessage(
        content.trim(),
        replyingTo ? replyingTo.id : null,
        uploadedAttachment,
        messageType,
      );

      setContent("");
      setAttachmentPreview(null);
      setShowEmojiPicker(false);
      setShowAttachmentMenu(false);
      onCancelReply();
      socketService.stopTyping(conversationId);

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    } catch (err: any) {
      modal.error(err.message || "Failed to send message");
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = content.trim().length > 0 || attachmentPreview !== null;

  return (
    <div className="relative select-none w-full">
      {/* Click-outside dismissal backdrop */}
      {(showEmojiPicker || showAttachmentMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowEmojiPicker(false);
            setShowAttachmentMenu(false);
          }}
        />
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute left-0 bottom-[calc(100%+10px)] z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          <EmojiPicker
            onSelectEmoji={handleAddEmoji}
            onClose={() => setShowEmojiPicker(false)}
            width={340}
            height={400}
          />
        </div>
      )}

      {/* WhatsApp Speed Dial Attachment Menu */}
      {showAttachmentMenu && (
        <div className="absolute left-10 sm:left-12 bottom-[calc(100%+10px)] z-50 bg-white dark:bg-[#233138] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 p-2 min-w-[200px] animate-in fade-in-0 slide-in-from-bottom-2 duration-150">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl hover:bg-[#f0f2f5] dark:hover:bg-[#182229] transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ac44cf] to-[#e06df6] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#111b21] dark:text-[#e9edef] leading-tight">
                Photos & Videos
              </p>
              <p className="text-[11px] text-[#667781] dark:text-[#8696a0]">
                Images, videos
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl hover:bg-[#f0f2f5] dark:hover:bg-[#182229] transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#5f66cd] to-[#8087f7] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#111b21] dark:text-[#e9edef] leading-tight">
                Document
              </p>
              <p className="text-[11px] text-[#667781] dark:text-[#8696a0]">
                PDF, DOCX, ZIP
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Replying Context Bar */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3.5 py-2 mb-2 bg-white dark:bg-[#182229] rounded-[8px] border-l-[3.5px] border-[#00a884] text-xs shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-150">
          <div className="min-w-0 pr-2">
            <span className="font-semibold text-[#00a884] text-[11px] block mb-0.5">
              Replying to message
            </span>
            <p className="text-[#667781] dark:text-[#8696a0] truncate text-xs">
              {replyingTo.content ||
                (replyingTo.attachment ? "Attachment" : "")}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="h-6 w-6 rounded-full flex items-center justify-center text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment Preview Box */}
      {attachmentPreview && (
        <div className="flex items-center justify-between px-3.5 py-2 mb-2 bg-white dark:bg-[#182229] rounded-[8px] border border-border/50 text-xs shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-3 min-w-0">
            {attachmentPreview.previewUrl ? (
              <img
                src={attachmentPreview.previewUrl}
                alt="Preview"
                className="w-12 h-12 object-cover rounded-[7px] border border-border/40 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-[7px] bg-[#00a884]/12 flex items-center justify-center text-[#00a884] shadow-sm">
                <FileText className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium truncate text-[#111b21] dark:text-[#e9edef]">
                {attachmentPreview.file.name}
              </p>
              <p className="text-[11px] text-[#8696a0] mt-0.5">
                {(attachmentPreview.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={() => setAttachmentPreview(null)}
            className="h-7 w-7 rounded-full flex items-center justify-center text-[#8696a0] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.zip,.xls,.xlsx"
      />

      {/* Composer Row */}
      <div className="flex items-end gap-2 w-full">
        {/* Left Action Buttons: Smile & Paperclip */}
        <div className="flex items-center gap-1 pb-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker((prev) => !prev);
                  setShowAttachmentMenu(false);
                }}
                className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  showEmojiPicker
                    ? "text-[#00a884] bg-[#00a884]/10"
                    : "text-[#54656f] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                }`}
              >
                <Smile className="w-[24px] h-[24px] stroke-[1.6]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Emojis</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  setShowAttachmentMenu((prev) => !prev);
                  setShowEmojiPicker(false);
                }}
                className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  showAttachmentMenu
                    ? "text-[#00a884] bg-[#00a884]/10 rotate-45"
                    : "text-[#54656f] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                }`}
              >
                <Paperclip className="w-[22px] h-[22px] stroke-[1.7]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Attach</TooltipContent>
          </Tooltip>
        </div>

        {/* Textarea Pill */}
        <div
          className={`flex-1 bg-white dark:bg-[#2a3942] rounded-[22px] px-4 py-2.5 shadow-[0_1px_1px_rgba(11,20,26,0.06)] border border-black/[0.04] dark:border-white/[0.04] transition-all ${
            isFocused ? "border-[#00a884]/40 ring-2 ring-[#00a884]/15" : ""
          }`}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              setShowAttachmentMenu(false);
            }}
            onBlur={() => setIsFocused(false)}
            placeholder="Type a message"
            className="w-full bg-transparent text-[15px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none resize-none max-h-32 leading-5"
          />
        </div>

        {/* Proper WhatsApp Send Icon Button */}
        <div className="pb-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={!hasContent || isUploading}
                onClick={() => handleSend()}
                className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                  hasContent
                    ? "bg-[#00a884] hover:bg-[#008069] text-white shadow-md shadow-[#00a884]/20 scale-100 hover:scale-105 active:scale-95 cursor-pointer"
                    : "text-[#8696a0] hover:text-[#54656f] dark:hover:text-[#aebac1] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-default"
                } ${isUploading ? "opacity-70 cursor-not-allowed" : ""}`}
                title="Send message (Enter)"
              >
                {isUploading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  /* Official WhatsApp Web Horizontal Send Paper Plane SVG */
                  <svg
                    viewBox="0 0 24 24"
                    width="21"
                    height="21"
                    className="fill-current translate-x-0.5"
                  >
                    <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817.011 7.912z" />
                  </svg>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>Send message (Enter)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
