import React, { useState } from 'react';
import { Conversation } from '../../types';
import { ChatItem } from './ChatItem';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Search, Filter, MessageSquareDashed, X } from 'lucide-react';

interface ChatListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conv: Conversation) => void;
  currentUserId: string;
  onOpenNewChat: () => void;
}

export function ChatList({
  conversations,
  selectedId,
  onSelect,
  currentUserId,
  onOpenNewChat,
}: ChatListProps) {
  const [search, setSearch] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filtered = conversations.filter((c) => {
    const nameMatch = (c.otherUser?.name || '').toLowerCase().includes(search.toLowerCase());
    const phoneMatch = (c.otherUser?.phoneNumber || '').includes(search);
    const unreadMatch = !filterUnread || c.unreadCount > 0;
    return (nameMatch || phoneMatch) && unreadMatch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#111b21] overflow-hidden">
      {/* Search Bar & Filter */}
      <div className="px-2.5 py-2 flex items-center gap-1.5">
        <div className={`flex-1 flex items-center bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg transition-all duration-200 ${
          isSearchFocused ? 'shadow-[0_0_0_1px_rgba(0,168,132,0.3)]' : ''
        }`}>
          <div className={`w-10 h-9 flex items-center justify-center transition-all duration-200 ${
            isSearchFocused ? 'text-[#00a884]' : 'text-[#54656f] dark:text-[#8696a0]'
          }`}>
            {isSearchFocused || search ? (
              <button
                onClick={() => { setSearch(''); }}
                className="hover:bg-black/[0.06] dark:hover:bg-white/[0.06] rounded-full w-7 h-7 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-[#00a884]" />
              </button>
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
          <input
            type="text"
            placeholder="Search or start new chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="flex-1 bg-transparent text-[13px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none h-9 pr-3"
          />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setFilterUnread(!filterUnread)}
              className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                filterUnread
                  ? 'bg-[#00a884] text-white shadow-sm'
                  : 'text-[#54656f] dark:text-[#8696a0] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33]'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {filterUnread ? 'Show all chats' : 'Filter unread messages'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Radix ScrollArea for Silky Smooth Scrolling */}
      <ScrollArea className="flex-1">
        <div>
          {filtered.length > 0 ? (
            filtered.map((conv) => (
              <ChatItem
                key={conv.id}
                conversation={conv}
                isSelected={conv.id === selectedId}
                onSelect={() => onSelect(conv)}
                currentUserId={currentUserId}
              />
            ))
          ) : (
            <div className="px-6 py-16 text-center flex flex-col items-center justify-center text-[#667781] dark:text-[#8696a0]">
              <div className="w-16 h-16 rounded-full bg-[#00a884]/10 flex items-center justify-center mb-4">
                <MessageSquareDashed className="w-8 h-8 text-[#00a884] opacity-60" />
              </div>
              <p className="text-sm font-medium mb-1">No conversations found</p>
              <p className="text-xs opacity-70 mb-4">Start chatting with someone new</p>
              <button
                onClick={onOpenNewChat}
                className="text-xs text-[#00a884] font-semibold hover:underline underline-offset-2 transition-all"
              >
                Start a new conversation
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
