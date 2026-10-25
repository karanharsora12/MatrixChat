import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phoneNumber: varchar('phone_number', { length: 32 }).notNull().unique(),
    phoneCountryCode: varchar('phone_country_code', { length: 8 }).notNull(),
    displayName: varchar('display_name', { length: 100 }),
    avatarUrl: text('avatar_url'),
    about: text('about').default('Hey there! I am using MatrixChat.'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    isOnline: boolean('is_online').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_users_phone').on(table.phoneNumber),
  ]
);

// 2. Sessions
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_sessions_user').on(table.userId),
    index('idx_sessions_token_hash').on(table.tokenHash),
  ]
);

// 3. OTP Challenges
export const otpChallenges = pgTable(
  'otp_challenges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phoneNumber: varchar('phone_number', { length: 32 }).notNull(),
    otpHash: varchar('otp_hash', { length: 128 }).notNull(),
    attempts: integer('attempts').default(0).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    resendAvailableAt: timestamp('resend_available_at', { withTimezone: true }).notNull(),
    isConsumed: boolean('is_consumed').default(false).notNull(),
    ipAddress: varchar('ip_address', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_otp_phone').on(table.phoneNumber),
    index('idx_otp_created_at').on(table.createdAt),
  ]
);

// 4. Conversations
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 16 }).default('direct').notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_conv_last_message').on(table.lastMessageAt),
  ]
);

// 5. Conversation Participants
export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    isPinned: boolean('is_pinned').default(false).notNull(),
    isMuted: boolean('is_muted').default(false).notNull(),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_participant_unique').on(table.conversationId, table.userId),
    index('idx_participant_user').on(table.userId),
    index('idx_participant_conv').on(table.conversationId),
  ]
);

// 6. Messages
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    senderId: uuid('sender_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    replyToId: uuid('reply_to_id'),
    content: text('content').notNull(),
    messageType: varchar('message_type', { length: 16 }).default('text').notNull(),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_messages_conv_created').on(table.conversationId, table.createdAt),
    index('idx_messages_sender').on(table.senderId),
  ]
);

// 7. Message Receipts
export const messageReceipts = pgTable(
  'message_receipts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    messageId: uuid('message_id')
      .references(() => messages.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    status: varchar('status', { length: 16 }).default('sent').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_receipt_message_user').on(table.messageId, table.userId),
    index('idx_receipt_user').on(table.userId),
  ]
);

// 8. Attachments
export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    messageId: uuid('message_id')
      .references(() => messages.id, { onDelete: 'cascade' })
      .notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    filePath: text('file_path').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: integer('file_size').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_attachments_message').on(table.messageId),
  ]
);

// 9. User Contacts
export const userContacts = pgTable(
  'user_contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    contactUserId: uuid('contact_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    customName: varchar('custom_name', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_user_contact_unique').on(table.userId, table.contactUserId),
    index('idx_user_contact_user').on(table.userId),
  ]
);

// 10. User Privacy Settings
export const userPrivacySettings = pgTable(
  'user_privacy_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    lastSeenVisibility: varchar('last_seen_visibility', { length: 16 }).default('everyone').notNull(),
    onlineVisibility: varchar('online_visibility', { length: 16 }).default('everyone').notNull(),
    avatarVisibility: varchar('avatar_visibility', { length: 16 }).default('everyone').notNull(),
    aboutVisibility: varchar('about_visibility', { length: 16 }).default('everyone').notNull(),
    readReceiptsEnabled: boolean('read_receipts_enabled').default(true).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// 11. User Blocks
export const userBlocks = pgTable(
  'user_blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    blockerId: uuid('blocker_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    blockedId: uuid('blocked_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_user_block_unique').on(table.blockerId, table.blockedId),
    index('idx_user_block_blocker').on(table.blockerId),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  participants: many(conversationParticipants),
  messages: many(messages),
  privacySettings: one(userPrivacySettings, {
    fields: [users.id],
    references: [userPrivacySettings.userId],
  }),
  savedContacts: many(userContacts, { relationName: 'savedContacts' }),
  blockedUsers: many(userBlocks, { relationName: 'blockedUsers' }),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(messages),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationParticipants.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receipts: many(messageReceipts),
  attachments: many(attachments),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
    relationName: 'replyMessage',
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  message: one(messages, {
    fields: [attachments.messageId],
    references: [messages.id],
  }),
}));
