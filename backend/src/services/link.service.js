import { nanoid } from 'nanoid';
import ConferenceLink from '../models/ConferenceLink.js';
import RoomEvent from '../models/RoomEvent.js';
import {
  generateToken,
  createRoom,
  getRoomParticipants,
  roomExists,
} from './livekit.service.js';


/**
 * Generate a unique conference link.
 * @param {string} creatorName - The name of the creator.
 * @param {Object} [config={}] - Configuration options for the link.
 * @param {number} [config.maxParticipants] - Limit to the number of participants.
 * @param {Object} [config.roomConfig] - LiveKit room specific options.
 * @param {number} [config.roomConfig.emptyTimeout] - Seconds to keep room open empty.
 * @param {boolean} [config.roomConfig.enableRecording] - Whether recording is enabled.
 * @param {boolean} [config.roomConfig.enableChat] - Whether chat is enabled.
 * @param {Date|string} [config.expiresAt] - Optional custom expiry date.
 * @param {Object} [config.metadata] - Optional arbitrary metadata.
 * @returns {Promise<Object>} Plain object of saved conference link with completeUrl.
 */
export const generateLink = async (creatorName, config = {}) => {
  // Generate unique 8-char nanoid
  // Ensure uniqueness in DB (retry if collision)
  let linkId;
  let isUnique = false;
  let retries = 5;

  while (!isUnique && retries > 0) {
    linkId = nanoid(8);
    const existing = await ConferenceLink.findOne({ linkId });
    if (!existing) {
      isUnique = true;
    } else {
      retries--;
    }
  }

  if (!isUnique) {
    throw new Error('Failed to generate a unique link ID after maximum retries');
  }

  // Calculate expiry date (default: +24h, max: +7 days)
  const now = new Date();
  let expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default: +24h

  if (config.expiresAt) {
    const inputExpiresAt = new Date(config.expiresAt);
    if (isNaN(inputExpiresAt.getTime())) {
      throw new Error('Invalid expiry date format');
    }

    const maxExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Max: +7 days
    if (inputExpiresAt > maxExpiry) {
      expiresAt = maxExpiry;
    } else if (inputExpiresAt < now) {
      throw new Error('Expiry date must be in the future');
    } else {
      expiresAt = inputExpiresAt;
    }
  }

  const newLink = new ConferenceLink({
    linkId,
    creatorName: creatorName || null,
    maxParticipants: config.maxParticipants ?? 20,
    roomConfig: {
      emptyTimeout: config.roomConfig?.emptyTimeout ?? 600,
      enableRecording: config.roomConfig?.enableRecording ?? false,
      enableChat: config.roomConfig?.enableChat ?? true,
    },
    expiresAt,
    metadata: config.metadata || {},
  });

  await newLink.save();

  // Return complete link URL
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const completeUrl = `${baseUrl.replace(/\/$/, '')}/join/${linkId}`;

  const linkObj = newLink.toObject();
  linkObj.completeUrl = completeUrl;

  return linkObj;
};

/**
 * Validate a conference link.
 * @param {string} linkId - The 8-character link ID.
 * @returns {Promise<Object>} The Mongoose ConferenceLink document.
 */
export const validateLink = async (linkId) => {
  const link = await ConferenceLink.findOne({ linkId });
  if (!link) {
    throw new Error('Link not found');
  }

  // Check if expired
  if (link.status === 'expired' || (link.expiresAt && new Date() > link.expiresAt)) {
    if (link.status !== 'expired') {
      link.status = 'expired';
      await link.save();
    }
    throw new Error('Link has expired');
  }

  // Check if status is active
  if (link.status !== 'active') {
    throw new Error(`Link is not active (status: ${link.status})`);
  }

  // Update lastAccessedAt
  link.lastAccessedAt = new Date();
  await link.save();

  return link;
};

/**
 * Get or create a LiveKit room associated with a link.
 * @param {string} linkId - The 8-character link ID.
 * @returns {Promise<Object>} The Room connection details.
 */
export const getOrCreateRoom = async (linkId) => {
  // Validate link first (implicitly fetches and checks expiration/status)
  const link = await validateLink(linkId);

  const roomName = `room-${linkId}`;

  // If room exists and is active, check LiveKit
  if (link.currentRoom && link.currentRoom.roomName && link.currentRoom.isActive) {
    const activeOnLiveKit = await roomExists(link.currentRoom.roomName);
    if (activeOnLiveKit) {
      return link.currentRoom;
    }
  }

  // Create new LiveKit room with link config
  const roomOptions = {
    emptyTimeout: link.roomConfig?.emptyTimeout ?? 600,
    maxParticipants: link.maxParticipants ?? 20,
  };

  await createRoom(roomName, roomOptions);

  // Update link's currentRoom field
  link.currentRoom = {
    roomName,
    isActive: true,
    participantCount: 0,
    startedAt: new Date(),
  };

  await link.save();

  // Record RoomEvent for room creation
  const event = new RoomEvent({
    linkId,
    event: 'created',
    participantCount: 0,
  });
  await event.save();

  return link.currentRoom;
};

/**
 * Generate a token for a participant to join the room.
 * @param {string} linkId - The 8-character link ID.
 * @param {string} participantName - Display name of the participant.
 * @returns {Promise<Object>} Connection details (token, wsUrl, room information).
 */
export const generateParticipantToken = async (linkId, participantName) => {
  // Validate link first
  await validateLink(linkId);

  // Get/create room
  const roomDetails = await getOrCreateRoom(linkId);

  // Generate identity (participant-{nanoid})
  const identity = `participant-${nanoid(6)}`;

  // Generate LiveKit token
  const tokenData = await generateToken(roomDetails.roomName, participantName, identity);

  return {
    token: tokenData.token,
    wsUrl: tokenData.wsUrl,
    room: {
      roomName: roomDetails.roomName,
      participantCount: roomDetails.participantCount,
      startedAt: roomDetails.startedAt,
    },
    participant: {
      identity,
      name: participantName,
    },
  };
};

/**
 * Query LiveKit for current participants and update participant count in database.
 * @param {string} roomName - The name of the room.
 * @returns {Promise<number>} Updated participant count.
 */
export const updateParticipantCount = async (roomName) => {
  let count = 0;
  try {
    const participantInfo = await getRoomParticipants(roomName);
    count = participantInfo.count;
  } catch (error) {
    // If the room has expired or been cleaned up from LiveKit, assume count = 0
    console.warn(`[Link Service] Failed to fetch participants for room "${roomName}":`, error.message || error);
  }

  const link = await ConferenceLink.findOne({ 'currentRoom.roomName': roomName });
  if (!link) {
    throw new Error(`Conference link not found for room name: ${roomName}`);
  }

  link.currentRoom.participantCount = count;
  if (count === 0) {
    const exists = await roomExists(roomName);
    if (!exists) {
      link.currentRoom.isActive = false;
    }
  }

  await link.save();
  return count;
};
