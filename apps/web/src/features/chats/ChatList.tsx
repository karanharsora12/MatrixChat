import React, { useState } from 'react';
import { Conversation } from '../../types';
import { ChatItem } from './ChatItem';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Search, Filter, MessageSquareDashed } from 'lucide-react';

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

  const filtered = conversations.filter((c) => {
    const nameMatch = (c.otherUser?.name || '').toLowerCase().includes(search.toLowerCase());
    const phoneMatch = (c.otherUser?.phoneNumber || '').includes(search);
    const unreadMatch = !filterUnread || c.unreadCount > 0;
    return (nameMatch || phoneMatch) && unreadMatch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-card overflow-hidden">
      {/* Search Bar & Filter with Tooltip */}
      <div className="p-2.5 border-b border-border/50 flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search or start new chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-xl bg-background border-border text-xs focus-visible:ring-[#00a884]"
          />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filterUnread ? 'matrix' : 'ghost'}
              size="icon"
              onClick={() => setFilterUnread(!filterUnread)}
              className="h-9 w-9 rounded-xl flex-shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {filterUnread ? 'Show all chats' : 'Filter unread messages'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Radix ScrollArea for Silky Smooth Scrolling */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/20">
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
            <div className="p-8 text-center flex flex-col items-center justify-center h-48 text-muted-foreground">
              <MessageSquareDashed className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-medium">No conversations found</p>
              <Button
                variant="link"
                onClick={onOpenNewChat}
                className="mt-2 text-xs text-[#00a884] font-semibold"
              >
                Start a new conversation
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
