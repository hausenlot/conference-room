export interface LinkConfig {
  maxParticipants?: number;
  roomConfig?: {
    emptyTimeout?: number;
    enableRecording?: boolean;
    enableChat?: boolean;
  };
}

export interface LinkResponse {
  linkId: string;
  url: string;
  expiresAt: string;
  config: LinkConfig;
}

export interface LinkStatusResponse {
  linkId: string;
  status: 'active' | 'expired' | 'inactive';
  expiresAt: string;
  roomActive: boolean;
  participantCount: number;
}

export interface JoinRoomResponse {
  token: string;
  url: string;
  roomName: string;
  participantIdentity: string;
}

export interface RoomStatusResponse {
  linkId: string;
  roomActive: boolean;
  participantCount: number;
}

/**
 * Service to handle communication with the backend API endpoints.
 */
export const ApiService = {
  /**
   * Creates a new conference link.
   */
  async createLink(
    creatorName?: string,
    maxParticipants?: number,
    expiryHours?: number
  ): Promise<LinkResponse> {
    const response = await fetch('/api/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creatorName: creatorName || undefined,
        maxParticipants: maxParticipants !== undefined ? Number(maxParticipants) : undefined,
        expiryHours: expiryHours !== undefined ? Number(expiryHours) : undefined,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create link: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Fetches status of a conference link to validate it.
   */
  async getLinkStatus(linkId: string): Promise<LinkStatusResponse> {
    const response = await fetch(`/api/links/${encodeURIComponent(linkId)}`);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to validate link: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Generates a token to join a room.
   */
  async joinRoom(linkId: string, participantName: string): Promise<JoinRoomResponse> {
    const response = await fetch(`/api/rooms/join/${encodeURIComponent(linkId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ participantName }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to join room: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Disconnects/leaves a room.
   */
  async leaveRoom(linkId: string, participantIdentity: string): Promise<{ success: boolean }> {
    const response = await fetch(`/api/rooms/${encodeURIComponent(linkId)}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ participantIdentity }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to leave room: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Gets current room status, syncing participant count.
   */
  async getRoomStatus(linkId: string): Promise<RoomStatusResponse> {
    const response = await fetch(`/api/rooms/${encodeURIComponent(linkId)}/status`);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to get room status: ${response.statusText}`);
    }
    return response.json();
  },
};
