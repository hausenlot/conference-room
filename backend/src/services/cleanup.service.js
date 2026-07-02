import cron from 'node-cron';
import ConferenceLink from '../models/ConferenceLink.js';
import RoomEvent from '../models/RoomEvent.js';
import { deleteRoom, getRoomParticipants } from './livekit.service.js';

/**
 * Find all links where expiresAt < now, update status to 'expired',
 * delete active rooms from LiveKit, and update the link's room status in the database.
 * @returns {Promise<{ updatedLinks: number, roomsDeleted: number }>} Counts of processed items.
 */
export const cleanupExpiredLinks = async () => {
  const now = new Date();
  let updatedCount = 0;
  let roomsDeletedCount = 0;

  try {
    const links = await ConferenceLink.find({
      expiresAt: { $lt: now },
      $or: [
        { status: { $ne: 'expired' } },
        { 'currentRoom.isActive': true }
      ]
    });

    for (const link of links) {
      try {
        let modified = false;
        if (link.status !== 'expired') {
          link.status = 'expired';
          modified = true;
        }

        if (link.currentRoom && link.currentRoom.isActive) {
          const roomName = link.currentRoom.roomName;
          if (roomName) {
            await deleteRoom(roomName);
            roomsDeletedCount++;
          }
          link.currentRoom.isActive = false;
          modified = true;
        }

        if (modified) {
          await link.save();
          updatedCount++;
        }
      } catch (err) {
        console.error(`[Cleanup Service] Error cleaning up expired link ${link.linkId}:`, err.message || err);
      }
    }
  } catch (error) {
    console.error('[Cleanup Service] Error in cleanupExpiredLinks:', error.message || error);
  }

  return { updatedLinks: updatedCount, roomsDeleted: roomsDeletedCount };
};

/**
 * Find active rooms with no participants in the database, check via LiveKit if actually empty,
 * and delete the room from LiveKit if empty for more than 5 minutes.
 * @returns {Promise<{ checked: number, cleaned: number }>} Counts of checked and cleaned rooms.
 */
export const cleanupAbandonedRooms = async () => {
  let checkedCount = 0;
  let cleanedCount = 0;

  try {
    const links = await ConferenceLink.find({
      'currentRoom.isActive': true,
      $or: [
        { 'currentRoom.participantCount': 0 },
        { 'currentRoom.participantCount': { $exists: false } },
        { 'currentRoom.participantCount': null }
      ]
    });

    for (const link of links) {
      checkedCount++;
      try {
        const roomName = link.currentRoom.roomName;
        if (!roomName) continue;

        let isActuallyEmpty = false;
        let existsOnLiveKit = true;

        try {
          const participantsInfo = await getRoomParticipants(roomName);
          if (participantsInfo.count === 0) {
            isActuallyEmpty = true;
          }
        } catch (error) {
          // If the room doesn't exist on LiveKit anymore, treat it as empty
          isActuallyEmpty = true;
          existsOnLiveKit = false;
        }

        if (isActuallyEmpty) {
          // Determine the duration the room has been empty.
          // Check the timestamp of the latest RoomEvent for the link.
          // If no event exists, fall back to currentRoom.startedAt.
          let emptySince = link.currentRoom.startedAt || link.createdAt;
          const lastEvent = await RoomEvent.findOne({ linkId: link.linkId }).sort({ timestamp: -1 });
          if (lastEvent) {
            emptySince = lastEvent.timestamp;
          }

          const elapsedMs = new Date() - new Date(emptySince);
          if (elapsedMs > 5 * 60 * 1000) {
            if (existsOnLiveKit) {
              await deleteRoom(roomName);
            }
            link.currentRoom.isActive = false;
            await link.save();
            cleanedCount++;
          }
        }
      } catch (err) {
        console.error(`[Cleanup Service] Error cleaning up abandoned room for link ${link.linkId}:`, err.message || err);
      }
    }
  } catch (error) {
    console.error('[Cleanup Service] Error in cleanupAbandonedRooms:', error.message || error);
  }

  return { checked: checkedCount, cleaned: cleanedCount };
};

/**
 * Setup cron jobs for scheduling room and link cleanups.
 */
export const setupCronJobs = () => {
  console.log('[Cleanup Service] Initializing room cleanup cron jobs...');

  // Run cleanupExpiredLinks every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron Job] Running cleanupExpiredLinks...');
    try {
      const result = await cleanupExpiredLinks();
      console.log(`[Cron Job] cleanupExpiredLinks finished. Links expired/updated: ${result.updatedLinks}, LiveKit rooms deleted: ${result.roomsDeleted}`);
    } catch (err) {
      console.error('[Cron Job Error] cleanupExpiredLinks failed:', err.message || err);
    }
  });

  // Run cleanupAbandonedRooms every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron Job] Running cleanupAbandonedRooms...');
    try {
      const result = await cleanupAbandonedRooms();
      console.log(`[Cron Job] cleanupAbandonedRooms finished. Checked: ${result.checked}, Cleaned: ${result.cleaned}`);
    } catch (err) {
      console.error('[Cron Job Error] cleanupAbandonedRooms failed:', err.message || err);
    }
  });

  console.log('[Cleanup Service] Cron jobs registered successfully.');
};
