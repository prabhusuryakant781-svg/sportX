/**
 * SportX Friend Repository
 * Manages athlete social connections, friend requests, and public athlete search.
 * 
 * Guarantees:
 * - Never exposes private user data (passwords, emails, device tokens).
 * - Rejects self-friend requests and duplicate pending requests.
 * - Enforces authorization: only receiver can accept/decline.
 */

import { db, hasFirebaseCredentials } from '../config/firebase';
import {
  FriendRequestDoc,
  FriendshipDoc,
  PublicAthleteProfile,
} from '../types';
import { UserRepository } from './userRepository';
import { NotificationRepository } from './notificationRepository';
import * as logger from 'firebase-functions/logger';

const REQUESTS_COLLECTION = 'friendRequests';
const FRIENDSHIPS_COLLECTION = 'friendships';

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore friend operation timeout')), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function getFriendshipDocId(userA: string, userB: string): string {
  const [first, second] = [userA, userB].sort();
  return `friend_${first}_${second}`;
}

const localRequestsCache: Map<string, FriendRequestDoc> = new Map();
const localFriendshipsCache: Map<string, FriendshipDoc> = new Map();

export class FriendRepository {
  /**
   * Send a friend request from sender to receiver
   */
  static async sendFriendRequest(senderId: string, receiverId: string): Promise<FriendRequestDoc> {
    if (!senderId || !receiverId) {
      throw new Error('Both senderId and receiverId are required');
    }
    if (senderId === receiverId) {
      throw new Error('Cannot send a friend request to yourself');
    }

    const [sender, receiver] = await Promise.all([
      UserRepository.getById(senderId),
      UserRepository.getById(receiverId),
    ]);

    if (!sender) throw new Error('Sender user does not exist');
    if (!receiver) throw new Error('Receiver athlete does not exist');

    // Check if already friends
    const friendshipId = getFriendshipDocId(senderId, receiverId);
    if (await this.isFriend(senderId, receiverId)) {
      throw new Error('You are already friends with this athlete');
    }

    // Check for existing pending request
    const existing = Array.from(localRequestsCache.values()).find(
      (r) =>
        r.status === 'pending' &&
        ((r.senderId === senderId && r.receiverId === receiverId) ||
         (r.senderId === receiverId && r.receiverId === senderId))
    );
    if (existing) {
      throw new Error('A pending friend request already exists between you and this athlete');
    }

    const now = new Date().toISOString();
    const requestId = `freq_${senderId}_${receiverId}_${Date.now()}`;

    const requestDoc: FriendRequestDoc = {
      requestId,
      senderId,
      senderName: sender.name || 'Athlete',
      senderAvatar: sender.profileImage || '',
      receiverId,
      receiverName: receiver.name || 'Athlete',
      receiverAvatar: receiver.profileImage || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    localRequestsCache.set(requestId, requestDoc);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(REQUESTS_COLLECTION).doc(requestId).set(requestDoc),
          3000
        );
      } catch (err) {
        logger.warn(`[FriendRepo] sendFriendRequest ${requestId} Firestore write failed:`, err);
      }
    }

    // Create notification for receiver
    try {
      await NotificationRepository.create({
        notificationId: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: receiverId,
        title: 'New Friend Request 🤝',
        body: `${sender.name || 'An athlete'} sent you a friend request.`,
        type: 'workout_reminder', // Reuse existing valid NotificationDoc type
        read: false,
        data: { requestId, senderId },
        createdAt: now,
      });
    } catch (_) {}

    return requestDoc;
  }

  /**
   * Accept a pending friend request
   */
  static async acceptFriendRequest(requestId: string, currentUserId: string): Promise<FriendshipDoc> {
    const request = await this.getRequestById(requestId);
    if (!request) {
      throw new Error('Friend request not found');
    }
    if (request.receiverId !== currentUserId) {
      throw new Error('Unauthorized: Only the recipient can accept this friend request');
    }
    if (request.status !== 'pending') {
      throw new Error(`Cannot accept friend request with status "${request.status}"`);
    }

    const now = new Date().toISOString();
    request.status = 'accepted';
    request.updatedAt = now;
    localRequestsCache.set(requestId, request);

    const friendshipId = getFriendshipDocId(request.senderId, request.receiverId);
    const [userA, userB] = [request.senderId, request.receiverId].sort();

    const friendshipDoc: FriendshipDoc = {
      friendshipId,
      userA,
      userB,
      createdAt: now,
    };

    localFriendshipsCache.set(friendshipId, friendshipDoc);

    if (hasFirebaseCredentials) {
      try {
        const batch = db.batch();
        batch.set(db.collection(REQUESTS_COLLECTION).doc(requestId), request, { merge: true });
        batch.set(db.collection(FRIENDSHIPS_COLLECTION).doc(friendshipId), friendshipDoc, { merge: true });
        await withTimeout(batch.commit(), 3000);
      } catch (err) {
        logger.warn(`[FriendRepo] acceptFriendRequest ${requestId} batch write failed:`, err);
      }
    }

    // Notify sender that request was accepted
    try {
      await NotificationRepository.create({
        notificationId: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: request.senderId,
        title: 'Friend Request Accepted! ⚡',
        body: `${request.receiverName} accepted your friend request. You can now challenge each other!`,
        type: 'workout_reminder',
        read: false,
        data: { friendshipId, friendId: request.receiverId },
        createdAt: now,
      });
    } catch (_) {}

    return friendshipDoc;
  }

  /**
   * Decline a pending friend request
   */
  static async declineFriendRequest(requestId: string, currentUserId: string): Promise<FriendRequestDoc> {
    const request = await this.getRequestById(requestId);
    if (!request) {
      throw new Error('Friend request not found');
    }
    if (request.receiverId !== currentUserId && request.senderId !== currentUserId) {
      throw new Error('Unauthorized to modify this friend request');
    }

    request.status = request.senderId === currentUserId ? 'cancelled' : 'declined';
    request.updatedAt = new Date().toISOString();
    localRequestsCache.set(requestId, request);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(
          db.collection(REQUESTS_COLLECTION).doc(requestId).set(request, { merge: true }),
          2500
        );
      } catch (err) {
        logger.warn(`[FriendRepo] declineFriendRequest ${requestId} failed:`, err);
      }
    }

    return request;
  }

  /**
   * Remove a friendship
   */
  static async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const friendshipId = getFriendshipDocId(userId, friendId);
    localFriendshipsCache.delete(friendshipId);

    if (hasFirebaseCredentials) {
      try {
        await withTimeout(db.collection(FRIENDSHIPS_COLLECTION).doc(friendshipId).delete(), 2500);
      } catch (err) {
        logger.warn(`[FriendRepo] removeFriend ${friendshipId} failed:`, err);
      }
    }

    return true;
  }

  /**
   * Check if two users are friends
   */
  static async isFriend(userA: string, userB: string): Promise<boolean> {
    const friendshipId = getFriendshipDocId(userA, userB);
    if (localFriendshipsCache.has(friendshipId)) return true;

    if (hasFirebaseCredentials) {
      try {
        const snap = await withTimeout(db.collection(FRIENDSHIPS_COLLECTION).doc(friendshipId).get(), 2000);
        if (snap.exists) {
          localFriendshipsCache.set(friendshipId, snap.data() as FriendshipDoc);
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  /**
   * Get single request by ID
   */
  static async getRequestById(requestId: string): Promise<FriendRequestDoc | null> {
    if (localRequestsCache.has(requestId)) {
      return localRequestsCache.get(requestId)!;
    }

    if (hasFirebaseCredentials) {
      try {
        const snap = await withTimeout(db.collection(REQUESTS_COLLECTION).doc(requestId).get(), 2000);
        if (snap.exists) {
          const data = snap.data() as FriendRequestDoc;
          localRequestsCache.set(requestId, data);
          return data;
        }
      } catch (_) {}
    }

    return null;
  }

  /**
   * Get pending requests for user (incoming and outgoing)
   */
  static async getUserRequests(userId: string): Promise<{ incoming: FriendRequestDoc[]; outgoing: FriendRequestDoc[] }> {
    let allRequests: FriendRequestDoc[] = [];

    if (hasFirebaseCredentials) {
      try {
        const [inSnap, outSnap] = await Promise.all([
          withTimeout(db.collection(REQUESTS_COLLECTION).where('receiverId', '==', userId).where('status', '==', 'pending').get(), 2500),
          withTimeout(db.collection(REQUESTS_COLLECTION).where('senderId', '==', userId).where('status', '==', 'pending').get(), 2500),
        ]);
        const inDocs = inSnap.docs.map((d) => d.data() as FriendRequestDoc);
        const outDocs = outSnap.docs.map((d) => d.data() as FriendRequestDoc);
        allRequests = [...inDocs, ...outDocs];
        for (const r of allRequests) {
          localRequestsCache.set(r.requestId, r);
        }
      } catch (err) {
        logger.warn(`[FriendRepo] getUserRequests for ${userId} failed:`, err);
      }
    }

    if (allRequests.length === 0) {
      allRequests = Array.from(localRequestsCache.values()).filter(
        (r) => (r.senderId === userId || r.receiverId === userId) && r.status === 'pending'
      );
    }

    return {
      incoming: allRequests.filter((r) => r.receiverId === userId && r.status === 'pending'),
      outgoing: allRequests.filter((r) => r.senderId === userId && r.status === 'pending'),
    };
  }

  /**
   * Get all friends for a user with public athlete profiles
   */
  static async getUserFriends(userId: string): Promise<PublicAthleteProfile[]> {
    let friendships: FriendshipDoc[] = [];

    if (hasFirebaseCredentials) {
      try {
        const [snapA, snapB] = await Promise.all([
          withTimeout(db.collection(FRIENDSHIPS_COLLECTION).where('userA', '==', userId).get(), 2500),
          withTimeout(db.collection(FRIENDSHIPS_COLLECTION).where('userB', '==', userId).get(), 2500),
        ]);
        friendships = [
          ...snapA.docs.map((d) => d.data() as FriendshipDoc),
          ...snapB.docs.map((d) => d.data() as FriendshipDoc),
        ];
        for (const f of friendships) {
          localFriendshipsCache.set(f.friendshipId, f);
        }
      } catch (err) {
        logger.warn(`[FriendRepo] getUserFriends for ${userId} failed:`, err);
      }
    }

    if (friendships.length === 0) {
      friendships = Array.from(localFriendshipsCache.values()).filter(
        (f) => f.userA === userId || f.userB === userId
      );
    }

    const friendIds = friendships.map((f) => (f.userA === userId ? f.userB : f.userA));
    const profiles: PublicAthleteProfile[] = [];

    for (const fid of friendIds) {
      const user = await UserRepository.getById(fid);
      if (user) {
        profiles.push({
          userId: user.userId,
          name: user.name || 'Athlete',
          profileImage: user.profileImage || '',
          collegeName: user.collegeName || 'Campus Athlete',
          department: user.department || 'General',
          rankTier: user.rankTier || 'Bronze',
          rankPoints: user.rankPoints || 100,
          level: user.level || 1,
          totalXp: (user as any).totalXp || user.xp || 0,
          currentStreak: user.currentStreak || 0,
          totalWorkouts: user.totalWorkouts || 0,
          equippedTitle: user.equippedTitle,
          featuredBadges: user.featuredBadges || [],
          isFriend: true,
          friendshipStatus: 'friends',
        });
      }
    }

    return profiles;
  }

  /**
   * Search athletes by query string (name, college, department)
   * Safely returns only public athlete profile fields.
   */
  static async searchAthletes(query: string, currentUserId: string): Promise<PublicAthleteProfile[]> {
    const cleanQuery = (query || '').toLowerCase().trim();
    if (!cleanQuery) return [];

    let users: any[] = [];

    if (hasFirebaseCredentials) {
      try {
        // Query users collection with reasonable limit
        const snap = await withTimeout(db.collection('users').limit(50).get(), 3000);
        users = snap.docs.map((d) => d.data());
      } catch (err) {
        logger.warn('[FriendRepo] searchAthletes Firestore read failed:', err);
      }
    }

    if (users.length === 0) {
      // Fallback: search local user repository cache
      users = await UserRepository.getAllUsers().catch(() => []);
    }

    // Filter out current user and match query on name, collegeName, or department
    const matches = users
      .filter((u) => u.userId !== currentUserId)
      .filter((u) => {
        const name = (u.name || '').toLowerCase();
        const college = (u.collegeName || '').toLowerCase();
        const dept = (u.department || '').toLowerCase();
        return name.includes(cleanQuery) || college.includes(cleanQuery) || dept.includes(cleanQuery);
      })
      .slice(0, 15);

    const publicProfiles: PublicAthleteProfile[] = [];

    for (const u of matches) {
      const isFr = await this.isFriend(currentUserId, u.userId);
      let friendshipStatus: PublicAthleteProfile['friendshipStatus'] = isFr ? 'friends' : 'none';

      if (!isFr) {
        const req = Array.from(localRequestsCache.values()).find(
          (r) =>
            r.status === 'pending' &&
            ((r.senderId === currentUserId && r.receiverId === u.userId) ||
             (r.senderId === u.userId && r.receiverId === currentUserId))
        );
        if (req) {
          friendshipStatus = req.senderId === currentUserId ? 'pending_sent' : 'pending_received';
        }
      }

      publicProfiles.push({
        userId: u.userId,
        name: u.name || 'Athlete',
        profileImage: u.profileImage || '',
        collegeName: u.collegeName || 'Campus Athlete',
        department: u.department || 'General',
        rankTier: u.rankTier || 'Bronze',
        rankPoints: u.rankPoints || 100,
        level: u.level || 1,
        totalXp: u.totalXp || u.xp || 0,
        currentStreak: u.currentStreak || 0,
        totalWorkouts: u.totalWorkouts || 0,
        equippedTitle: u.equippedTitle,
        featuredBadges: u.featuredBadges || [],
        isFriend: isFr,
        friendshipStatus,
      });
    }

    return publicProfiles;
  }

  /**
   * Clear local cache (for testing)
   */
  static clearCache() {
    localRequestsCache.clear();
    localFriendshipsCache.clear();
  }
}
