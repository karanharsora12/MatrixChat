import { db } from '../../db/index.js';
import { users, userContacts, userBlocks, userPrivacySettings } from '../../db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { normalizeE164, normalizeEmail, sanitizeString, isValidUUID } from '../../utils/validation.js';

export class ContactsService {
  /**
   * Search for a single user by phone number or email address
   */
  async searchContact(
    requestingUserId: string,
    params: { phoneNumber?: string; email?: string; query?: string }
  ) {
    let targetUser: typeof users.$inferSelect | undefined;

    const rawInput = (params.email || params.phoneNumber || params.query || '').trim();
    if (!rawInput) {
      throw { status: 400, message: 'Please enter a phone number or email address to search.' };
    }

    if (params.email || rawInput.includes('@')) {
      const normalizedEmail = normalizeEmail(rawInput);
      if (!normalizedEmail) {
        throw { status: 400, message: 'Invalid email address format.' };
      }

      const [found] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (!found) {
        throw { status: 404, message: 'No registered MatrixChat user found with this email address.' };
      }
      targetUser = found;
    } else {
      const normalizedPhone = normalizeE164(rawInput);
      if (!normalizedPhone) {
        throw { status: 400, message: 'Invalid mobile phone number format.' };
      }

      const [found] = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, normalizedPhone))
        .limit(1);

      if (!found) {
        throw { status: 404, message: 'No registered MatrixChat user found with this phone number.' };
      }
      targetUser = found;
    }

    if (targetUser.id === requestingUserId) {
      throw { status: 400, message: 'You cannot add or search yourself.' };
    }

    // Check if target user has blocked requesting user
    const [blocked] = await db
      .select()
      .from(userBlocks)
      .where(and(eq(userBlocks.blockerId, targetUser.id), eq(userBlocks.blockedId, requestingUserId)))
      .limit(1);

    if (blocked) {
      throw { status: 404, message: 'User not found or unavailable.' };
    }

    // Check if already in requesting user's contacts
    const [existingContact] = await db
      .select()
      .from(userContacts)
      .where(and(eq(userContacts.userId, requestingUserId), eq(userContacts.contactUserId, targetUser.id)))
      .limit(1);

    // Check privacy settings for avatar and about
    const [privacy] = await db
      .select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.userId, targetUser.id))
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
      id: targetUser.id,
      displayName: existingContact?.customName || targetUser.displayName || targetUser.email || 'MatrixChat User',
      originalDisplayName: targetUser.displayName,
      avatarUrl: allowsAvatar ? targetUser.avatarUrl : null,
      about: allowsAbout ? targetUser.about : null,
      isContact: Boolean(existingContact),
      customName: existingContact?.customName || null,
      phoneNumber: targetUser.phoneNumber,
      email: targetUser.email,
    };
  }

  /**
   * Search for a single user by normalized phone number (backward compatible)
   */
  async searchByPhone(requestingUserId: string, rawPhone: string) {
    return this.searchContact(requestingUserId, { phoneNumber: rawPhone });
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
        email: users.email,
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
      name: item.customName || item.displayName || item.email || item.phoneNumber || 'MatrixChat User',
      displayName: item.displayName,
      customName: item.customName,
      avatarUrl: item.avatarUrl,
      about: item.about,
      isOnline: item.isOnline,
      lastSeenAt: item.lastSeenAt,
      phoneNumber: item.phoneNumber,
      email: item.email,
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
