import { db, pool } from './index.js';
import {
  users,
  userPrivacySettings,
  userContacts,
  conversations,
  conversationParticipants,
  messages,
  messageReceipts,
} from './schema.js';

async function seed() {
  console.log('[Seed] Starting test database seeding...');

  // Clean existing test data safely
  await db.delete(messageReceipts);
  await db.delete(messages);
  await db.delete(conversationParticipants);
  await db.delete(conversations);
  await db.delete(userContacts);
  await db.delete(userPrivacySettings);
  await db.delete(users);

  // 1. Insert Fictional Matrix Users
  const testUsersData = [
    {
      phoneNumber: '+14155550101',
      phoneCountryCode: '+1',
      displayName: 'Neo (Thomas Anderson)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      about: 'There is no spoon. Looking for the white rabbit.',
      isOnline: true,
      lastSeenAt: new Date(),
    },
    {
      phoneNumber: '+14155550102',
      phoneCountryCode: '+1',
      displayName: 'Trinity',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      about: 'Dodge this. The matrix cannot tell you who you are.',
      isOnline: true,
      lastSeenAt: new Date(),
    },
    {
      phoneNumber: '+14155550103',
      phoneCountryCode: '+1',
      displayName: 'Morpheus',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      about: 'Free your mind. Red pill or blue pill?',
      isOnline: false,
      lastSeenAt: new Date(Date.now() - 1000 * 60 * 25), // 25 mins ago
    },
    {
      phoneNumber: '+442079460199',
      phoneCountryCode: '+44',
      displayName: 'Cypher',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      about: 'Ignorance is bliss. Steak tastes delicious.',
      isOnline: false,
      lastSeenAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    },
  ];

  const insertedUsers = await db.insert(users).values(testUsersData).returning();
  console.log(`[Seed] Inserted ${insertedUsers.length} users.`);

  // 2. Insert Privacy Settings
  for (const u of insertedUsers) {
    await db.insert(userPrivacySettings).values({
      userId: u.id,
      lastSeenVisibility: 'everyone',
      onlineVisibility: 'everyone',
      avatarVisibility: 'everyone',
      aboutVisibility: 'everyone',
      readReceiptsEnabled: true,
    });
  }

  const [neo, trinity, morpheus, cypher] = insertedUsers;

  // 3. User Contacts
  await db.insert(userContacts).values([
    { userId: neo.id, contactUserId: trinity.id, customName: 'Trinity (Operator)' },
    { userId: neo.id, contactUserId: morpheus.id, customName: 'Morpheus (Captain)' },
    { userId: trinity.id, contactUserId: neo.id, customName: 'Neo' },
    { userId: morpheus.id, contactUserId: neo.id, customName: 'The One' },
  ]);

  // 4. Sample Conversation between Neo & Trinity
  const [conv1] = await db
    .insert(conversations)
    .values({
      type: 'direct',
      lastMessageAt: new Date(),
    })
    .returning();

  await db.insert(conversationParticipants).values([
    { conversationId: conv1.id, userId: neo.id, isPinned: true },
    { conversationId: conv1.id, userId: trinity.id, isPinned: false },
  ]);

  const msg1 = await db
    .insert(messages)
    .values({
      conversationId: conv1.id,
      senderId: trinity.id,
      content: 'Neo, you are in danger. Follow the white rabbit.',
      messageType: 'text',
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
    })
    .returning();

  const msg2 = await db
    .insert(messages)
    .values({
      conversationId: conv1.id,
      senderId: neo.id,
      content: 'Who is this? How did you get this number?',
      messageType: 'text',
      createdAt: new Date(Date.now() - 1000 * 60 * 10),
    })
    .returning();

  const msg3 = await db
    .insert(messages)
    .values({
      conversationId: conv1.id,
      senderId: trinity.id,
      content: 'I know why you are here, Neo. Morpheus wants to meet you.',
      messageType: 'text',
      createdAt: new Date(Date.now() - 1000 * 60 * 2),
    })
    .returning();

  // Receipts
  await db.insert(messageReceipts).values([
    { messageId: msg1[0].id, userId: neo.id, status: 'read', readAt: new Date() },
    { messageId: msg2[0].id, userId: trinity.id, status: 'read', readAt: new Date() },
    { messageId: msg3[0].id, userId: neo.id, status: 'delivered', deliveredAt: new Date() },
  ]);

  console.log('[Seed] Seeding completed successfully!');
  await pool.end();
}

seed().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
