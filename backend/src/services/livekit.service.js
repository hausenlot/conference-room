import { RoomServiceClient, AccessToken } from 'livekit-server-sdk';
import config from '../config/env.js';

// Initialize LiveKit RoomServiceClient with credentials
const roomService = new RoomServiceClient(
  config.livekitUrl,
  config.livekitApiKey,
  config.livekitApiSecret
);

/**
 * Generate an AccessToken for a participant to join a room.
 * @param {string} roomName - The name of the room to join.
 * @param {string} participantName - The display name of the participant.
 * @param {string} identity - The unique identity of the participant.
 * @returns {Promise<{ token: string, wsUrl: string }>} JWT token and WebSocket URL.
 */
export const generateToken = async (roomName, participantName, identity) => {
  const token = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
    identity,
    name: participantName,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const jwt = await token.toJwt();
  return {
    token: jwt,
    wsUrl: config.livekitUrl,
  };
};

/**
 * Create a new room via the LiveKit API.
 * @param {string} roomName - The name of the room to create.
 * @param {Object} [options={}] - Additional creation options.
 * @param {number} [options.emptyTimeout] - Seconds to keep room open before anyone joins.
 * @param {number} [options.maxParticipants] - Limit to the number of participants.
 * @returns {Promise<Object>} The room details.
 */
export const createRoom = async (roomName, options = {}) => {
  const room = await roomService.createRoom({
    name: roomName,
    emptyTimeout: options.emptyTimeout,
    maxParticipants: options.maxParticipants,
    ...options,
  });
  return room;
};

/**
 * Get active participants in a room.
 * @param {string} roomName - The name of the room.
 * @returns {Promise<{ count: number, participants: Array }>} Active participant count and list.
 */
export const getRoomParticipants = async (roomName) => {
  const participants = await roomService.listParticipants(roomName);
  return {
    count: participants.length,
    participants,
  };
};

/**
 * Force delete a room from LiveKit.
 * @param {string} roomName - The name of the room to delete.
 * @returns {Promise<boolean>} True on success, false on failure.
 */
export const deleteRoom = async (roomName) => {
  try {
    await roomService.deleteRoom(roomName);
    return true;
  } catch (error) {
    console.error(`[LiveKit Service] Failed to delete room "${roomName}":`, error.message || error);
    return false;
  }
};

/**
 * Check if a room exists and is active (has active participants).
 * @param {string} roomName - The name of the room.
 * @returns {Promise<boolean>} True if the room exists and has participants, false otherwise.
 */
export const isRoomActive = async (roomName) => {
  try {
    const rooms = await roomService.listRooms([roomName]);
    const room = rooms.find((r) => r.name === roomName);
    if (!room) {
      return false;
    }
    return room.numParticipants > 0;
  } catch (error) {
    console.error(`[LiveKit Service] Error checking active status for room "${roomName}":`, error.message || error);
    return false;
  }
};

/**
 * Check if a room exists in LiveKit (active or empty).
 * @param {string} roomName - The name of the room.
 * @returns {Promise<boolean>} True if the room exists, false otherwise.
 */
export const roomExists = async (roomName) => {
  try {
    const rooms = await roomService.listRooms([roomName]);
    const room = rooms.find((r) => r.name === roomName);
    return !!room;
  } catch (error) {
    console.error(`[LiveKit Service] Error checking existence for room "${roomName}":`, error.message || error);
    return false;
  }
};

/**
 * Remove a participant from a LiveKit room.
 * @param {string} roomName - The name of the room.
 * @param {string} identity - The identity of the participant to remove.
 * @returns {Promise<boolean>} True on success, false on failure.
 */
export const removeParticipant = async (roomName, identity) => {
  try {
    await roomService.removeParticipant(roomName, identity);
    return true;
  } catch (error) {
    console.warn(`[LiveKit Service] Failed to remove participant "${identity}" from room "${roomName}":`, error.message || error);
    return false;
  }
};


