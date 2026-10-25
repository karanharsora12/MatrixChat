import { db } from '../../db/index.js';
import { users, userContacts, userBlocks, userPrivacySettings } from '../../db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { normalizeE164, sanitizeString, isValidUUID } from '../../utils/validation.js';

export class ContactsService {
  /**
   * Search for a single user by normalized phone number
   */
  async searchByPhone(requestingUserId: string, rawPhone: string) {
    const normalizedPhone = normalizeE164(rawPhone);
    if (!normalizedPhone) {
      throw { status: 400, message: 'Invalid mobile phone number format.' };
    }

    const [foundUser] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, normalizedPhone))
      .limit(1);

    if (!foundUser) {
      throw { status: 404, message: 'No registered MatrixChat user found with this phone number.' };
    }

    if (foundUser.id === requestingUserId) {
      throw { status: 400, message: 'You cannot add or search your own phone number.' };
    }

    // Check if target user has blocked requesting user
    const [blocked] = await db
      .select()
      .from(userBlocks)
      .where(and(eq(userBlocks.blockerId, foundUser.id), eq(userBlocks.blockedId, requestingUserId)))
      .limit(1);

    if (blocked) {
      throw { status: 404, message: 'No registered MatrixChat user found with this phone number.' };
    }

    // Check if already in requesting user's contacts
    const [existingContact] = await db
      .select()
      .from(userContacts)
      .where(and(eq(userContacts.userId, requestingUserId), eq(userContacts.contactUserId, foundUser.id)))
      .limit(1);

    // Check privacy settings for avatar and about
    const [privacy] = await db
      .select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.userId, foundUser.id))
      .limit(1);

    const allowsAvatar =
      !privacy ||
      privacy.avatarVisibility === 'everyone' ||
      (privacy.avatarVisibility === 'contacts' && Boolean(existingContact));

    const allowsAbout =
      !privacy ||
      privacy.aboutVisibility === 'everyone' ||
      (privacy.aboutVisibility === 'contacts' && Boolean(existingContact));

    return {
      id: foundUser.id,
      displayName: existingContact?.customName || foundUser.displayName || 'MatrixChat User',
      originalDisplayName: foundUser.displayName,
      avatarUrl: allowsAvatar ? foundUser.avatarUrl : null,
      about: allowsAbout ? foundUser.about : null,
      isContact: Boolean(existingContact),
      customName: existingContact?.customName || null,
      phoneNumber: foundUser.phoneNumber, // revealed upon deliberate search match
    };
  }

  /**
   * List saved contacts for a user
   */
  async listContacts(userId: string) {
    const list = await db
      .select({
        contactId: userContacts.id,
        userId: users.id,
        phoneNumber: users.phoneNumber,
        displayName: users.displayName,
        customName: userContacts.customName,
        avatarUrl: users.avatarUrl,
        about: users.about,
        isOnline: users.isOnline,
        lastSeenAt: users.lastSeenAt,
        createdAt: userContacts.createdAt,
      })
      .from(userContacts)
      .innerJoin(users, eq(users.id, userContacts.contactUserId))
      .where(eq(userContacts.userId, userId));

    return list.map((item) => ({
      id: item.userId,
      contactId: item.contactId,
      name: item.customName || item.displayName || 'MatrixChat User',
      displayName: item.displayName,
      customName: item.customName,
      avatarUrl: item.avatarUrl,
      about: item.about,
      isOnline: item.isOnline,
      lastSeenAt: item.lastSeenAt,
      phoneNumber: item.phoneNumber,
    }));
  }

  /**
   * Save or update a contact
   */
  async saveContact(userId: string, contactUserId: string, customName?: string) {
    if (!isValidUUID(contactUserId)) {
      throw { status: 400, message: 'Invalid contact user ID.' };
    }

    if (userId === contactUserId) {
      throw { status: 400, message: 'Cannot save yourself as a contact.' };
    }

    const [target] = await db.select().from(users).where(eq(users.id, contactUserId)).limit(1);
    if (!target) {
      throw { status: 404, message: 'Contact user not found.' };
    }

    const sanitizedName = customName ? sanitizeString(customName, 100) : null;

    const [saved] = await db
      .insert(userContacts)
      .values({
        userId,
        contactUserId,
        customName: sanitizedName,
      })
      .onConflictDoUpdate({
        target: [userContacts.userId, userContacts.contactUserId],
        set: { customName: sanitizedName },
      })
      .returning();

    return {
      success: true,
      contact: saved,
      user: {
        id: target.id,
        name: sanitizedName || target.displayName || 'MatrixChat User',
        avatarUrl: target.avatarUrl,
      },
    };
  }

  /**
   * Remove a contact
   */
  async deleteContact(userId: string, contactUserId: string) {
    if (!isValidUUID(contactUserId)) {
      throw { status: 400, message: 'Invalid contact user ID.' };
    }

    await db
      .delete(userContacts)
      .where(and(eq(userContacts.userId, userId), eq(userContacts.contactUserId, contactUserId)));

    return { success: true };
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, targetUserId: string) {
    if (!isValidUUID(targetUserId)) {
      throw { status: 400, message: 'Invalid target user ID.' };
    }
    if (userId === targetUserId) {
      throw { status: 400, message: 'Cannot block yourself.' };
    }

    await db
      .insert(userBlocks)
      .values({
        blockerId: userId,
        blockedId: targetUserId,
      })
      .onConflictDoNothing();

    return { success: true, message: 'User blocked.' };
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, targetUserId: string) {
    if (!isValidUUID(targetUserId)) {
      throw { status: 400, message: 'Invalid target user ID.' };
    }

    await db
      .delete(userBlocks)
      .where(and(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, targetUserId)));

    return { success: true, message: 'User unblocked.' };
  }

  /**
   * List blocked users
   */
  async listBlockedUsers(userId: string) {
    const blocked = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        blockedAt: userBlocks.createdAt,
      })
      .from(userBlocks)
      .innerJoin(users, eq(users.id, userBlocks.blockedId))
      .where(eq(userBlocks.blockerId, userId));

    return blocked;
  }
}

export const contactsService = new ContactsService();
