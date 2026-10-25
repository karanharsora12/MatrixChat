export interface User {
  id: string;
  phoneNumber: string;
  phoneCountryCode: string;
  displayName: string | null;
  avatarUrl: string | null;
  about: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt?: string;
  privacySettings?: PrivacySettings;
}

export interface PrivacySettings {
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  onlineVisibility: 'everyone' | 'contacts' | 'nobody';
  avatarVisibility: 'everyone' | 'contacts' | 'nobody';
  aboutVisibility: 'everyone' | 'contacts' | 'nobody';
  readReceiptsEnabled: boolean;
}

export interface Contact {
  id: string;
  contactId: string;
  name: string;
  displayName: string | null;
  customName: string | null;
  avatarUrl: string | null;
  about: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  phoneNumber: string;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
}

export interface MessageReceipt {
  status: 'sent' | 'delivered' | 'read';
  readAt?: string | null;
  deliveredAt?: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
  } | null;
  content: string;
  messageType: 'text' | 'image' | 'file';
  isDeleted: boolean;
  createdAt: string;
  receipt?: MessageReceipt | null;
  attachment?: MessageAttachment | null;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  isPinned: boolean;
  isMuted: boolean;
  lastReadAt?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  otherUser: {
    id: string;
    name: string;
    displayName: string | null;
    avatarUrl: string | null;
    about: string | null;
    isOnline: boolean;
    lastSeenAt: string | null;
    phoneNumber?: string;
  } | null;
  lastMessage?: {
    id: string;
    content: string;
    messageType: string;
    senderId: string;
    isDeleted: boolean;
    createdAt: string;
  } | null;
}
