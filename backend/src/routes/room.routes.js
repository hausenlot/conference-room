import express from 'express';
import {
  generateParticipantToken,
  updateParticipantCount,
  validateLink
} from '../services/link.service.js';
import { removeParticipant } from '../services/livekit.service.js';
import ConferenceLink from '../models/ConferenceLink.js';
import RoomEvent from '../models/RoomEvent.js';

const router = express.Router();

/**
 * POST /api/rooms/join/:linkId
 * Body: { participantName }
 * Validates name, generates token, updates DB participant count, and logs participant_joined.
 */
router.post('/join/:linkId', async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { participantName } = req.body;

    if (!participantName || typeof participantName !== 'string' || !participantName.trim()) {
      res.status(400);
      throw new Error('participantName is required');
    }

    if (participantName.length > 50) {
      res.status(400);
      throw new Error('participantName must not exceed 50 characters');
    }

    // Call generateParticipantToken which validates link and creates room if needed
    const connectionDetails = await generateParticipantToken(linkId, participantName);

    // Increment participant count in DB
    const link = await ConferenceLink.findOne({ linkId });
    if (link && link.currentRoom) {
      link.currentRoom.participantCount += 1;
      await link.save();

      // Log participant_joined RoomEvent
      const event = new RoomEvent({
        linkId,
        event: 'participant_joined',
        participantCount: link.currentRoom.participantCount,
      });
      await event.save();
    }

    return res.status(200).json({
      token: connectionDetails.token,
      url: connectionDetails.wsUrl,
      roomName: connectionDetails.room.roomName,
      participantIdentity: connectionDetails.participant.identity,
    });
  } catch (error) {
    if (error.message === 'Link not found') {
      res.status(404);
    } else if (error.message === 'Link has expired' || error.message.includes('not active')) {
      res.status(400);
    }
    next(error);
  }
});

/**
 * GET /api/rooms/:linkId/status
 * Returns current room status, syncing with LiveKit for participant count.
 */
router.get('/:linkId/status', async (req, res, next) => {
  try {
    const { linkId } = req.params;
    
    // Validate the link
    const link = await validateLink(linkId);

    let participantCount = link.currentRoom?.participantCount ?? 0;
    let isActive = link.currentRoom?.isActive ?? false;

    if (link.currentRoom && link.currentRoom.roomName && link.currentRoom.isActive) {
      // Sync actual participant count from LiveKit
      participantCount = await updateParticipantCount(link.currentRoom.roomName);
      
      // Reload room status
      const updatedLink = await ConferenceLink.findOne({ linkId });
      isActive = updatedLink.currentRoom?.isActive ?? false;
    }

    return res.status(200).json({
      linkId,
      roomActive: isActive,
      participantCount,
    });
  } catch (error) {
    if (error.message === 'Link not found') {
      res.status(404);
    } else if (error.message === 'Link has expired' || error.message.includes('not active')) {
      res.status(400);
    }
    next(error);
  }
});

/**
 * POST /api/rooms/:linkId/leave
 * Body: { participantIdentity }
 * Removes participant from LiveKit room, updates participant count, and logs participant_left.
 */
router.post('/:linkId/leave', async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { participantIdentity } = req.body;

    if (!participantIdentity || typeof participantIdentity !== 'string' || !participantIdentity.trim()) {
      res.status(400);
      throw new Error('participantIdentity is required');
    }

    const link = await ConferenceLink.findOne({ linkId });
    if (!link) {
      res.status(404);
      throw new Error('Link not found');
    }

    if (link.currentRoom && link.currentRoom.isActive) {
      const roomName = link.currentRoom.roomName;

      // Remove participant from LiveKit (swallows errors internally if already gone)
      await removeParticipant(roomName, participantIdentity);

      // Sync participant count
      const updatedCount = await updateParticipantCount(roomName);

      // Log participant_left RoomEvent
      const event = new RoomEvent({
        linkId,
        event: 'participant_left',
        participantCount: updatedCount,
      });
      await event.save();
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
