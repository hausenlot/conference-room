import express from 'express';
import ConferenceLink from '../models/ConferenceLink.js';

const router = express.Router();

/**
 * GET /api/admin/stats
 * Counts active links, active rooms, and total participants in active rooms.
 */
router.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();

    // 1. Count active links (status is 'active' and not expired)
    const activeLinks = await ConferenceLink.countDocuments({
      status: 'active',
      expiresAt: { $gt: now }
    });

    // 2. Count active rooms (currentRoom.isActive is true)
    const activeRooms = await ConferenceLink.countDocuments({
      'currentRoom.isActive': true
    });

    // 3. Count total participants in active rooms
    const activeRoomsWithCount = await ConferenceLink.aggregate([
      { $match: { 'currentRoom.isActive': true } },
      {
        $group: {
          _id: null,
          total: { $sum: '$currentRoom.participantCount' }
        }
      }
    ]);
    const totalParticipants = activeRoomsWithCount[0]?.total || 0;

    return res.status(200).json({
      activeLinks,
      activeRooms,
      totalParticipants
    });
  } catch (error) {
    next(error);
  }
});

export default router;
