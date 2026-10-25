import React, { useEffect, useRef } from 'react';
import Picker, {
  EmojiClickData,
  EmojiStyle,
  Theme,
  SkinTonePickerLocation,
  SuggestionMode,
} from 'emoji-picker-react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export function EmojiPicker({
  onSelectEmoji,
  onClose,
  width = 360,
  height = 420,
  className = '',
}: EmojiPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if MatrixChat is currently in dark mode
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Handle click outside and Escape key to close the picker
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    // emojiData.emoji contains the selected Unicode emoji (with skin tone applied if chosen)
    onSelectEmoji(emojiData.emoji);
  };

  return (
    <div
      ref={containerRef}
      className={`shadow-2xl rounded-2xl overflow-hidden border border-border/80 bg-white dark:bg-[#202c33] animate-in fade-in-0 zoom-in-95 duration-150 select-none ${className}`}
      style={{
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <Picker
        onEmojiClick={handleEmojiClick}
        theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
        emojiStyle={EmojiStyle.NATIVE}
        skinTonePickerLocation={SkinTonePickerLocation.SEARCH}
        suggestedEmojisMode={SuggestionMode.RECENT}
        searchPlaceHolder="Search emoji..."
        autoFocusSearch={false}
        lazyLoadEmojis={true}
        width={width}
        height={height}
        previewConfig={{
          showPreview: true,
          defaultCaption: 'Select an emoji',
        }}
      />
    </div>
  );
}

export default EmojiPicker;
