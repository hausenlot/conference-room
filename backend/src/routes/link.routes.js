import express from 'express';
import { generateLink, validateLink } from '../services/link.service.js';
import { deleteRoom } from '../services/livekit.service.js';
import ConferenceLink from '../models/ConferenceLink.js';

const router = express.Router();

/**
 * POST /api/links
 * Creates a new conference link.
 * Body parameters (optional): creatorName, maxParticipants, expiryHours, roomConfig
 */
router.post('/', async (req, res, next) => {
  try {
    const { creatorName, maxParticipants, expiryHours, roomConfig } = req.body;

    const config = {};
    if (maxParticipants !== undefined) {
      config.maxParticipants = maxParticipants;
    }
    if (roomConfig !== undefined) {
      config.roomConfig = roomConfig;
    }
    if (expiryHours !== undefined) {
      const expiryNum = Number(expiryHours);
      if (isNaN(expiryNum) || expiryNum < 1 || expiryNum > 168) {
        res.status(400);
        throw new Error('expiryHours must be a number between 1 and 168');
      }
      config.expiresAt = new Date(Date.now() + expiryNum * 60 * 60 * 1000);
    }

    const linkObj = await generateLink(creatorName, config);

    return res.status(201).json({
      linkId: linkObj.linkId,
      url: linkObj.completeUrl,
      expiresAt: linkObj.expiresAt,
      config: {
        maxParticipants: linkObj.maxParticipants,
        roomConfig: linkObj.roomConfig,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/links/:linkId
 * Validates the conference link and returns its current status.
 */
router.get('/:linkId', async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const link = await validateLink(linkId);

    return res.status(200).json({
      linkId: link.linkId,
      status: link.status,
      expiresAt: link.expiresAt,
      roomActive: link.currentRoom?.isActive ?? false,
      participantCount: link.currentRoom?.participantCount ?? 0,
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
 * DELETE /api/links/:linkId
 * Expires a conference link and cleans up the active LiveKit room if it exists.
 */
router.delete('/:linkId', async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const link = await ConferenceLink.findOne({ linkId });
    if (!link) {
      res.status(404);
      throw new Error('Link not found');
    }

    // Mark link as expired
    link.status = 'expired';

    // Clean up associated room if active
    if (link.currentRoom && link.currentRoom.isActive) {
      const roomName = link.currentRoom.roomName;
      if (roomName) {
        await deleteRoom(roomName);
      }
      link.currentRoom.isActive = false;
    }

    await link.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
