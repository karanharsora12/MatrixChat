import { db } from '../../db/index.js';
import { users, userPrivacySettings, userBlocks, userContacts } from '../../db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { sanitizeString, isOneOf } from '../../utils/validation.js';

export class UsersService {
  async getMyProfile(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    let [privacy] = await db
      .select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.userId, userId))
      .limit(1);

    if (!privacy) {
      const [newPrivacy] = await db
        .insert(userPrivacySettings)
        .values({
          userId: user.id,
          lastSeenVisibility: 'everyone',
          onlineVisibility: 'everyone',
          avatarVisibility: 'everyone',
          aboutVisibility: 'everyone',
          readReceiptsEnabled: true,
        })
        .returning();
      privacy = newPrivacy;
    }

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      phoneCountryCode: user.phoneCountryCode,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      about: user.about,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
      privacySettings: {
        lastSeenVisibility: privacy.lastSeenVisibility,
        onlineVisibility: privacy.onlineVisibility,
        avatarVisibility: privacy.avatarVisibility,
        aboutVisibility: privacy.aboutVisibility,
        readReceiptsEnabled: privacy.readReceiptsEnabled,
      },
    };
  }

  async updateProfile(userId: string, data: { displayName?: string; about?: string; avatarUrl?: string }) {
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (data.displayName !== undefined) {
      const sanitized = sanitizeString(data.displayName, 100);
      if (sanitized.length < 1) {
        throw { status: 400, message: 'Display name cannot be empty.' };
      }
      updateData.displayName = sanitized;
    }

    if (data.about !== undefined) {
      updateData.about = sanitizeString(data.about, 250);
    }

    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl ? sanitizeString(data.avatarUrl, 500) : null;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async updatePrivacySettings(
    userId: string,
    data: {
      lastSeenVisibility?: 'everyone' | 'contacts' | 'nobody';
      onlineVisibility?: 'everyone' | 'contacts' | 'nobody';
      avatarVisibility?: 'everyone' | 'contacts' | 'nobody';
      aboutVisibility?: 'everyone' | 'contacts' | 'nobody';
      readReceiptsEnabled?: boolean;
    }
  ) {
    const allowed = ['everyone', 'contacts', 'nobody'] as const;
    const updatePayload: Record<string, any> = { updatedAt: new Date() };

    if (data.lastSeenVisibility) {
      if (!isOneOf(data.lastSeenVisibility, allowed)) {
        throw { status: 400, message: 'Invalid lastSeenVisibility value.' };
      }
      updatePayload.lastSeenVisibility = data.lastSeenVisibility;
    }

    if (data.onlineVisibility) {
      if (!isOneOf(data.onlineVisibility, allowed)) {
        throw { status: 400, message: 'Invalid onlineVisibility value.' };
      }
      updatePayload.onlineVisibility = data.onlineVisibility;
    }

    if (data.avatarVisibility) {
      if (!isOneOf(data.avatarVisibility, allowed)) {
        throw { status: 400, message: 'Invalid avatarVisibility value.' };
      }
      updatePayload.avatarVisibility = data.avatarVisibility;
    }

    if (data.aboutVisibility) {
      if (!isOneOf(data.aboutVisibility, allowed)) {
        throw { status: 400, message: 'Invalid aboutVisibility value.' };
      }
      updatePayload.aboutVisibility = data.aboutVisibility;
    }

    if (typeof data.readReceiptsEnabled === 'boolean') {
      updatePayload.readReceiptsEnabled = data.readReceiptsEnabled;
    }

    const [updated] = await db
      .insert(userPrivacySettings)
      .values({
        userId,
        ...updatePayload,
      })
      .onConflictDoUpdate({
        target: userPrivacySettings.userId,
        set: updatePayload,
      })
      .returning();

    return updated;
  }

  async getPublicProfile(targetUserId: string, requestingUserId: string) {
    // Check if blocked in either direction
    const [block] = await db
      .select()
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerId, targetUserId), eq(userBlocks.blockedId, requestingUserId)),
          and(eq(userBlocks.blockerId, requestingUserId), eq(userBlocks.blockedId, targetUserId))
        )
      )
      .limit(1);

    if (block) {
      // If blocked, reveal minimal info
      return {
        id: targetUserId,
        displayName: 'MatrixChat User',
        avatarUrl: null,
        about: null,
        isOnline: false,
        lastSeenAt: null,
        isBlocked: true,
      };
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!targetUser) {
      throw { status: 404, message: 'User not found.' };
    }

    // Check if contacts
    const [isContact] = await db
      .select()
      .from(userContacts)
      .where(and(eq(userContacts.userId, targetUserId), eq(userContacts.contactUserId, requestingUserId)))
      .limit(1);

    // Get privacy settings
    const [privacy] = await db
      .select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.userId, targetUserId))
      .limit(1);

    const allowsAvatar =
      !privacy ||
      privacy.avatarVisibility === 'everyone' ||
      (privacy.avatarVisibility === 'contacts' && Boolean(isContact));

    const allowsAbout =
      !privacy ||
      privacy.aboutVisibility === 'everyone' ||
      (privacy.aboutVisibility === 'contacts' && Boolean(isContact));

    const allowsOnline =
      !privacy ||
      privacy.onlineVisibility === 'everyone' ||
      (privacy.onlineVisibility === 'contacts' && Boolean(isContact));

    const allowsLastSeen =
      !privacy ||
      privacy.lastSeenVisibility === 'everyone' ||
      (privacy.lastSeenVisibility === 'contacts' && Boolean(isContact));

    return {
      id: targetUser.id,
      displayName: targetUser.displayName || 'MatrixChat User',
      avatarUrl: allowsAvatar ? targetUser.avatarUrl : null,
      about: allowsAbout ? targetUser.about : null,
      isOnline: allowsOnline ? targetUser.isOnline : false,
      lastSeenAt: allowsLastSeen ? targetUser.lastSeenAt : null,
      isBlocked: false,
    };
  }
}

export const usersService = new UsersService();
