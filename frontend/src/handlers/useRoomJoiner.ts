import { useState, useEffect, useRef } from 'react';
import { ApiService, type LinkStatusResponse, type JoinRoomResponse } from '../services/api.service';

/**
 * Handler for managing room verification, joining, and status updates.
 */
export function useRoomJoiner(linkId: string | null) {
  const [isVerifying, setIsVerifying] = useState(true);
  const [linkStatus, setLinkStatus] = useState<LinkStatusResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Join form states
  const [participantName, setParticipantName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // LiveKit connection states
  const [connectionDetails, setConnectionDetails] = useState<JoinRoomResponse | null>(null);
  const [joined, setJoined] = useState(false);

  // Ref to track latest participantIdentity for cleanup
  const identityRef = useRef<string | null>(null);
  const leaveCalledRef = useRef<boolean>(false);

  // Verify the link validity
  useEffect(() => {
    if (!linkId) {
      setVerifyError('No link ID provided');
      setIsVerifying(false);
      return;
    }

    let active = true;

    async function checkLink() {
      setIsVerifying(true);
      setVerifyError(null);
      try {
        const status = await ApiService.getLinkStatus(linkId!);
        if (!active) return;

        // Extra client-side check for expiry
        const isExpired = status.status === 'expired' ||
          (status.expiresAt && new Date() > new Date(status.expiresAt));

        if (isExpired) {
          setVerifyError('This link has expired');
        } else {
          setLinkStatus(status);
        }
      } catch (err: any) {
        if (!active) return;
        setVerifyError(err.message || 'Invalid or non-existent link ID');
      } finally {
        if (active) {
          setIsVerifying(false);
        }
      }
    }

    checkLink();

    return () => {
      active = false;
    };
  }, [linkId]);

  // Poll participant count and room active status every 5 seconds when NOT joined yet
  useEffect(() => {
    if (!linkId || joined || isVerifying || verifyError) return;

    const interval = setInterval(async () => {
      try {
        const status = await ApiService.getRoomStatus(linkId);
        setLinkStatus((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            roomActive: status.roomActive,
            participantCount: status.participantCount,
          };
        });
      } catch (err) {
        console.error('Error polling room status:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [linkId, joined, isVerifying, verifyError]);

  // Join room function
  const join = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!linkId) return;
    if (!participantName.trim()) {
      setJoinError('Please enter your name');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const details = await ApiService.joinRoom(linkId, participantName.trim());
      setConnectionDetails(details);
      identityRef.current = details.participantIdentity;
      leaveCalledRef.current = false;
      setJoined(true);
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join the room');
    } finally {
      setIsJoining(false);
    }
  };

  // Leave room function
  const leave = async () => {
    if (!linkId || !identityRef.current || leaveCalledRef.current) return;

    leaveCalledRef.current = true;
    const currentIdentity = identityRef.current;

    // Clear state immediately for UI responsiveness
    setJoined(false);
    setConnectionDetails(null);
    identityRef.current = null;

    try {
      await ApiService.leaveRoom(linkId, currentIdentity);
    } catch (err) {
      console.error('Failed to notify backend about leaving:', err);
    }
  };

  // Automatically call leave API if component unmounts while in room
  useEffect(() => {
    return () => {
      // Execute cleanup on unmount
      if (identityRef.current && !leaveCalledRef.current) {
        const currentIdentity = identityRef.current;
        const currentLinkId = linkId;
        if (currentLinkId) {
          // Fire-and-forget sendBeacon or standard fetch
          fetch(`/api/rooms/${encodeURIComponent(currentLinkId)}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantIdentity: currentIdentity }),
            keepalive: true, // ensures the request finishes after tab/component closes
          }).catch((err) => console.error('Unmount leave failed:', err));
        }
      }
    };
  }, [linkId]);

  return {
    isVerifying,
    linkStatus,
    verifyError,
    participantName,
    setParticipantName,
    isJoining,
    joinError,
    connectionDetails,
    joined,
    join,
    leave,
  };
}
