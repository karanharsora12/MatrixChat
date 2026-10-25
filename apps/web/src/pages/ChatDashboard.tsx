import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Conversation, Message } from '../types';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { formatDateDivider } from '../utils/formatters';
import { ChatList } from '../features/chats/ChatList';
import { ChatHeader } from '../features/chats/ChatHeader';
import { MessageBubble } from '../features/chats/MessageBubble';
import { MessageComposer } from '../features/chats/MessageComposer';
import { EmptyChatState } from '../features/chats/EmptyChatState';
import { NewChatModal } from '../features/contacts/NewChatModal';
import { ProfileModal } from '../features/profile/ProfileModal';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import {
  MessageSquare,
  Moon,
  Sun,
  LogOut,
  Plus,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

export function ChatDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState(0);

  // Modals
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Refs for instantaneous & smooth scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const unreadDividerRef = useRef<HTMLDivElement>(null);
  const messagesCache = useRef<Record<string, Message[]>>({});
  const isInitialLoadRef = useRef<boolean>(true);
  const unreadCountAtOpenRef = useRef<number>(0);

  // 1. Initial Load of Conversations
  const loadConversations = async () => {
    try {
      const data = await api.listConversations();
      setConversations(data);
    } catch (err) {
      console.error('[Load Conversations Error]', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // 2. Select Chat: Instant Render (0ms Delay) from cache + Background Fetch
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    unreadCountAtOpenRef.current = conv.unreadCount || 0;
    isInitialLoadRef.current = true;
    setNewMessagesWhileScrolled(0);

    // Instant render if cached
    const cached = messagesCache.current[conv.id];
    if (cached && cached.length > 0) {
      setMessages(cached);
      setLoadingMessages(false);
    } else {
      setLoadingMessages(true);
    }
  };

  // 3. Fetch fresh messages on conversation change
  useEffect(() => {
    if (!selectedConv) {
      setMessages([]);
      return;
    }

    const convId = selectedConv.id;
    let isCancelled = false;

    const fetchMessages = async () => {
      try {
        const data = await api.getMessages(convId);
        if (isCancelled) return;

        messagesCache.current[convId] = data;
        setMessages(data);

        // Mark read
        api.markRead(convId);
        socketService.markRead(convId);

        // Reset local badge
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
        );
      } catch (err) {
        console.error('[Fetch Messages Error]', err);
      } finally {
        if (!isCancelled) {
          setLoadingMessages(false);
        }
      }
    };

    fetchMessages();

    // Join conversation room
    socketService.joinConversation(convId);
    setIsRecipientTyping(false);

    return () => {
      isCancelled = true;
      socketService.leaveConversation(convId);
    };
  }, [selectedConv?.id]);

  // 4. Smart Instant vs Smooth Scrolling
  useLayoutEffect(() => {
    if (!scrollContainerRef.current || messages.length === 0) return;

    if (isInitialLoadRef.current) {
      // On initial chat opening: snap directly with ZERO delay!
      if (unreadCountAtOpenRef.current > 0 && unreadDividerRef.current) {
        // Jump directly to first unread message
        unreadDividerRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
      } else {
        // Direct jump to latest message
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
      isInitialLoadRef.current = false;
    } else {
      // New incoming or sent message while active:
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;

      if (isNearBottom) {
        // User is near bottom: smoothly animate down
        scrollContainerRef.current.scrollTo({
          top: scrollHeight,
          behavior: 'smooth',
        });
      } else {
        // User is scrolled up reading history
        setNewMessagesWhileScrolled((prev) => prev + 1);
      }
    }
  }, [messages]);

  // Detect user scroll position
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isScrolledUp);

    if (!isScrolledUp) {
      setNewMessagesWhileScrolled(0);
    }
  };

  const scrollToBottomSmooth = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
    setNewMessagesWhileScrolled(0);
  };

  // 5. Socket Event Subscriptions
  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;

    // A. Real-time message arrived
    const handleMessageReceived = (data: { message: Message; conversationId: string }) => {
      // Update cache
      const cached = messagesCache.current[data.conversationId] || [];
      if (!cached.some((m) => m.id === data.message.id)) {
        messagesCache.current[data.conversationId] = [...cached, data.message];
      }

      if (selectedConv && data.conversationId === selectedConv.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });

        if (data.message.senderId !== user?.id) {
          api.markRead(selectedConv.id);
          socketService.markRead(selectedConv.id);
        }
      }
      loadConversations();
    };

    // A2. Message deleted in real time
    const handleMessageDeleted = (data: { conversationId: string; messageId: string }) => {
      const cached = messagesCache.current[data.conversationId] || [];
      messagesCache.current[data.conversationId] = cached.map((m) =>
        m.id === data.messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
      );

      if (selectedConv && data.conversationId === selectedConv.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId
              ? { ...m, isDeleted: true, content: 'This message was deleted' }
              : m
          )
        );
      }
      loadConversations();
    };

    // B. Conversation sidebar update
    const handleConversationUpdated = () => {
      loadConversations();
    };

    // C. User typing indicator
    const handleUserTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (selectedConv && data.conversationId === selectedConv.id && data.userId !== user?.id) {
        setIsRecipientTyping(data.isTyping);
      }
    };

    // D. Read receipts
    const handleMessagesRead = (data: { conversationId: string; readByUserId: string }) => {
      if (selectedConv && data.conversationId === selectedConv.id && data.readByUserId !== user?.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user?.id
              ? { ...m, receipt: { status: 'read', readAt: new Date().toISOString() } }
              : m
          )
        );
      }
    };

    // E. Presence updates
    const handlePresenceChanged = (data: { userId: string; isOnline: boolean; lastSeenAt: string }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.otherUser?.id === data.userId) {
            return {
              ...conv,
              otherUser: {
                ...conv.otherUser,
                isOnline: data.isOnline,
                lastSeenAt: data.lastSeenAt,
              },
            };
          }
          return conv;
        })
      );

      if (selectedConv?.otherUser?.id === data.userId) {
        setSelectedConv((prev) =>
          prev
            ? {
                ...prev,
                otherUser: prev.otherUser
                  ? {
                      ...prev.otherUser,
                      isOnline: data.isOnline,
                      lastSeenAt: data.lastSeenAt,
                    }
                  : null,
              }
            : null
        );
      }
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('conversation_updated', handleConversationUpdated);
    socket.on('user_typing', handleUserTyping);
    socket.on('messages_read', handleMessagesRead);
    socket.on('presence_changed', handlePresenceChanged);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('user_typing', handleUserTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('presence_changed', handlePresenceChanged);
    };
  }, [selectedConv?.id, user?.id]);

  // Send message handler
  const handleSendMessage = async (
    content: string,
    replyToId?: string | null,
    attachment?: any
  ) => {
    if (!selectedConv) return;

    const messageType = attachment
      ? attachment.mimeType.startsWith('image/')
        ? 'image'
        : 'file'
      : 'text';

    try {
      let sent;
      try {
        sent = await socketService.sendMessage({
          conversationId: selectedConv.id,
          content,
          replyToId,
          messageType,
          attachment,
        });
      } catch (wsErr) {
        console.warn('[Socket send failed, using REST fallback]', wsErr);
        sent = await api.sendMessage(
          selectedConv.id,
          content,
          replyToId,
          messageType,
          attachment
        );
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });

      // Update cache
      messagesCache.current[selectedConv.id] = [
        ...(messagesCache.current[selectedConv.id] || []),
        sent,
      ];

      loadConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await api.deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
        )
      );
      loadConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  const handleTogglePin = async () => {
    if (!selectedConv) return;
    try {
      const newStatus = !selectedConv.isPinned;
      await api.updateConversationSettings(selectedConv.id, { isPinned: newStatus });
      setSelectedConv({ ...selectedConv, isPinned: newStatus });
      loadConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to update pin');
    }
  };

  const handleToggleMute = async () => {
    if (!selectedConv) return;
    try {
      const newStatus = !selectedConv.isMuted;
      await api.updateConversationSettings(selectedConv.id, { isMuted: newStatus });
      setSelectedConv({ ...selectedConv, isMuted: newStatus });
      loadConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to update mute setting');
    }
  };

  const handleBlockUser = async () => {
    if (!selectedConv?.otherUser) return;
    if (confirm(`Block ${selectedConv.otherUser.name}? You will no longer receive their messages.`)) {
      try {
        await api.blockUser(selectedConv.otherUser.id);
        alert('User blocked.');
        setSelectedConv(null);
        loadConversations();
      } catch (err: any) {
        alert(err.message || 'Failed to block user');
      }
    }
  };

  // Helper for date headers
  const shouldShowDateDivider = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true;
    const d1 = new Date(currentMsg.createdAt);
    const d2 = new Date(prevMsg.createdAt);
    return (
      d1.getDate() !== d2.getDate() ||
      d1.getMonth() !== d2.getMonth() ||
      d1.getFullYear() !== d2.getFullYear()
    );
  };

  const unreadSplitIndex =
    unreadCountAtOpenRef.current > 0
      ? messages.length - unreadCountAtOpenRef.current
      : -1;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-chat-lightBg dark:bg-chat-darkBg font-sans select-none antialiased">
      {/* 1. Left Sidebar: Chat list & User controls */}
      <div
        className={`w-full md:w-96 lg:w-[420px] flex-shrink-0 flex flex-col h-full bg-white dark:bg-[#111b21] border-r border-chat-borderLight dark:border-chat-borderDark/40 z-30 ${
          selectedConv ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-4 bg-card border-b border-border/50 flex items-center justify-between flex-shrink-0">
          {/* User profile avatar trigger */}
          <div
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <Avatar className="w-10 h-10 border border-border group-hover:ring-2 group-hover:ring-[#00a884] transition-all">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
              <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                {(user?.displayName || 'U')[0]}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate group-hover:text-[#00a884] transition-colors">
                {user?.displayName || 'Set Display Name'}
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                {user?.phoneNumber}
              </p>
            </div>
          </div>

          {/* Action icons with Tooltips */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsNewChatOpen(true)}
                  className="h-9 w-9 text-[#00a884] hover:bg-[#00a884]/10"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start new chat</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Log out</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Chat List */}
        <ChatList
          conversations={conversations}
          selectedId={selectedConv?.id || null}
          onSelect={handleSelectConversation}
          currentUserId={user?.id || ''}
          onOpenNewChat={() => setIsNewChatOpen(true)}
        />
      </div>

      {/* 2. Main Conversation Panel */}
      <div
        className={`flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] relative z-10 ${
          !selectedConv ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedConv ? (
          <>
            {/* WhatsApp Doodle Wallpaper Texture Overlay */}
            <div
              className="absolute inset-0 opacity-[0.05] dark:opacity-[0.035] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#00a884 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />

            {/* Conversation Header */}
            <ChatHeader
              conversation={selectedConv}
              isTyping={isRecipientTyping}
              onBack={() => setSelectedConv(null)}
              onTogglePin={handleTogglePin}
              onToggleMute={handleToggleMute}
              onBlockUser={handleBlockUser}
              onOpenProfile={() => setIsProfileOpen(true)}
            />

            {/* Messages Scroll Area */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-16 py-4 space-y-1 z-10"
            >
              {loadingMessages && messages.length === 0 ? (
                <div className="flex justify-center items-center h-full text-muted-foreground text-xs gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#00a884]" />
                  <span>Loading messages...</span>
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg, idx) => {
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const showDate = shouldShowDateDivider(msg, prevMsg);
                  const isUnreadSplitPoint = idx === unreadSplitIndex;

                  return (
                    <React.Fragment key={msg.id}>
                      {/* Date Divider Badge */}
                      {showDate && (
                        <div className="flex justify-center my-3 select-none">
                          <span className="bg-white/80 dark:bg-[#182229]/80 backdrop-blur-sm text-muted-foreground text-[11px] font-medium uppercase px-3 py-1 rounded-lg shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] border border-border/30">
                            {formatDateDivider(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      {/* Unread Messages Divider Badge */}
                      {isUnreadSplitPoint && (
                        <div ref={unreadDividerRef} className="flex justify-center my-3 select-none">
                          <div className="bg-[#00a884]/15 border border-[#00a884]/30 text-[#00a884] text-[11px] font-semibold tracking-wider uppercase px-4 py-1 rounded-full shadow-sm">
                            {unreadCountAtOpenRef.current} Unread{' '}
                            {unreadCountAtOpenRef.current === 1 ? 'Message' : 'Messages'}
                          </div>
                        </div>
                      )}

                      <MessageBubble
                        message={msg}
                        isMe={msg.senderId === user?.id}
                        onReply={(m) => setReplyingTo(m)}
                        onDelete={handleDeleteMessage}
                      />
                    </React.Fragment>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-xs text-muted-foreground select-none">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/50 shadow-sm max-w-xs text-foreground">
                    <MessageSquare className="w-4 h-4 text-[#00a884] shrink-0" />
                    <span>No messages yet. Say hello and start the conversation!</span>
                  </div>
                </div>
              )}
            </div>

            {/* Floating "Scroll to Bottom" Button (WhatsApp Web Style) */}
            {showScrollBottom && (
              <button
                type="button"
                onClick={scrollToBottomSmooth}
                className="absolute right-6 bottom-20 z-30 w-10 h-10 rounded-full bg-white dark:bg-[#202c33] shadow-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover:scale-110 active:scale-95 animate-in fade-in-0 zoom-in-90 cursor-pointer"
                title="Scroll to bottom"
              >
                <ChevronDown className="w-5 h-5" />
                {newMessagesWhileScrolled > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#00a884] text-white text-[10px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center shadow">
                    {newMessagesWhileScrolled}
                  </span>
                )}
              </button>
            )}

            {/* Message Composer */}
            <MessageComposer
              conversationId={selectedConv.id}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              onSendMessage={handleSendMessage}
            />
          </>
        ) : (
          <EmptyChatState />
        )}
      </div>

      {/* 3. New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onSelectConversation={(conv) => {
          handleSelectConversation(conv);
          loadConversations();
        }}
      />

      {/* 4. Profile & Privacy Modal */}
      {user && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={user}
          onUserUpdated={async () => {
            await refreshUser();
            await loadConversations();
          }}
        />
      )}
    </div>
  );
}
