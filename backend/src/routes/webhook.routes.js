import express from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import config from '../config/env.js';
import ConferenceLink from '../models/ConferenceLink.js';
import RoomEvent from '../models/RoomEvent.js';
import { updateParticipantCount } from '../services/link.service.js';

const router = express.Router();

// Initialize WebhookReceiver
const receiver = new WebhookReceiver(config.livekitApiKey, config.livekitWebhookSecret);

/**
 * POST /api/webhooks/livekit
 * Handles LiveKit webhook events.
 */
router.post('/livekit', express.raw({ type: ['application/webhook+json', 'application/json'] }), async (req, res, next) => {
  try {
    const authHeader = req.get('Authorization') || req.get('Authorize');
    
    // Convert body Buffer to string
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
    
    if (!rawBody) {
      res.status(400);
      throw new Error('Empty request body');
    }
    
    // Verify signature
    let event;
    try {
      event = await receiver.receive(rawBody, authHeader);
    } catch (err) {
      res.status(400);
      throw new Error(`Webhook validation failed: ${err.message}`);
    }
    
    // Return 200 OK quickly (async processing)
    res.status(200).json({ received: true });
    
    // Process the event asynchronously to prevent blocking the webhook emitter
    handleWebhookEventAsync(event).catch((err) => {
      console.error('[Webhook Error] Error processing event asynchronously:', err);
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper to process the webhook event asynchronously and update DB accordingly.
 * @param {Object} event - The verified LiveKit webhook event.
 */
async function handleWebhookEventAsync(event) {
  const eventName = event.event;
  const roomName = event.room?.name;
  if (!roomName) {
    console.warn(`[Webhook Router] Event ${eventName} received without a room name.`);
    return;
  }

  // Extract linkId from roomName (room-${linkId})
  let linkId = '';
  if (roomName.startsWith('room-')) {
    linkId = roomName.replace('room-', '');
  }

  // Find the ConferenceLink
  const link = await ConferenceLink.findOne({
    $or: [
      { linkId: linkId },
      { 'currentRoom.roomName': roomName }
    ]
  });

  if (!link) {
    console.warn(`[Webhook Router] No ConferenceLink found for roomName "${roomName}" / linkId "${linkId}"`);
    return;
  }

  const resolvedLinkId = link.linkId;

  console.log(`[Webhook Router] Processing event "${eventName}" for linkId "${resolvedLinkId}" / room "${roomName}"`);

  switch (eventName) {
    case 'room_started': {
      if (!link.currentRoom) {
        link.currentRoom = {};
      }
      link.currentRoom.roomName = roomName;
      link.currentRoom.isActive = true;
      if (!link.currentRoom.startedAt) {
        link.currentRoom.startedAt = new Date();
      }
      await link.save();
      break;
    }

    case 'room_finished': {
      if (link.currentRoom) {
        link.currentRoom.isActive = false;
        link.currentRoom.participantCount = 0;
      }
      await link.save();

      // Log RoomEvent type 'ended'
      const roomEvent = new RoomEvent({
        linkId: resolvedLinkId,
        event: 'ended',
        participantCount: 0,
      });
      await roomEvent.save();
      break;
    }

    case 'participant_joined': {
      const updatedCount = await updateParticipantCount(roomName);
      const participantIdentity = event.participant?.identity || null;
      
      // Prevent duplicate logging of participant_joined for same participant if it was logged recently
      if (participantIdentity) {
        const recentEvent = await RoomEvent.findOne({
          linkId: resolvedLinkId,
          event: 'participant_joined',
          participantIdentity,
          timestamp: { $gte: new Date(Date.now() - 30 * 1000) } // within last 30s
        });
        if (recentEvent) {
          console.log(`[Webhook Router] participant_joined event for "${participantIdentity}" was already logged recently. Skipping duplicate logging.`);
          break;
        }
      }

      // Log event
      const roomEvent = new RoomEvent({
        linkId: resolvedLinkId,
        event: 'participant_joined',
        participantIdentity,
        participantCount: updatedCount,
      });
      await roomEvent.save();
      break;
    }

    case 'participant_left': {
      const updatedCount = await updateParticipantCount(roomName);
      const participantIdentity = event.participant?.identity || null;

      // Prevent duplicate logging of participant_left for same participant if it was logged recently
      if (participantIdentity) {
        const recentEvent = await RoomEvent.findOne({
          linkId: resolvedLinkId,
          event: 'participant_left',
          participantIdentity,
          timestamp: { $gte: new Date(Date.now() - 30 * 1000) } // within last 30s
        });
        if (recentEvent) {
          console.log(`[Webhook Router] participant_left event for "${participantIdentity}" was already logged recently. Skipping duplicate logging.`);
          break;
        }
      }

      // Log event
      const roomEvent = new RoomEvent({
        linkId: resolvedLinkId,
        event: 'participant_left',
        participantIdentity,
        participantCount: updatedCount,
      });
      await roomEvent.save();
      break;
    }

    case 'track_published': {
      const participantIdentity = event.participant?.identity || null;
      const trackSid = event.track?.sid || null;
      const trackType = event.track?.type || null;
      const trackName = event.track?.name || null;
      const trackSource = event.track?.source || null;

      const trackInfo = {
        sid: trackSid,
        type: trackType,
        name: trackName,
        source: trackSource,
      };

      const roomEvent = new RoomEvent({
        linkId: resolvedLinkId,
        event: 'track_published',
        participantIdentity,
        participantCount: link.currentRoom?.participantCount || 0,
        metadata: { track: trackInfo }
      });
      await roomEvent.save();

      console.log(`[Webhook Router] Track published log recorded for participant "${participantIdentity}":`, trackInfo);
      break;
    }

    default:
      console.log(`[Webhook Router] Event "${eventName}" ignored.`);
      break;
  }
}

export default router;
