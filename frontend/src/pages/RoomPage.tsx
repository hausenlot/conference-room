import React, { useState } from 'react';
import { useRoomJoiner } from '../handlers/useRoomJoiner';
import { Spinner } from '../components/Spinner';
import { CountdownTimer } from '../components/CountdownTimer';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useParticipants,
} from '@livekit/components-react';
import { Copy, Check, Video, User, ShieldAlert, ArrowLeft } from 'lucide-react';

interface RoomPageProps {
  linkId: string;
  onGoBack: () => void;
}

export const RoomPage: React.FC<RoomPageProps> = ({ linkId, onGoBack }) => {
  const {
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
  } = useRoomJoiner(linkId);

  if (isVerifying) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Spinner size="lg" className="text-accent mb-4" />
        <p className="text-text text-sm">Verifying conference link...</p>
      </div>
    );
  }

  if (verifyError || !linkStatus) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 mb-6 flex flex-col items-center gap-3">
          <ShieldAlert className="w-12 h-12" />
          <h2 className="text-xl font-bold text-red-500 m-0">Access Denied</h2>
          <p className="text-sm text-text m-0">{verifyError || 'This conference link is invalid or expired.'}</p>
        </div>
        <button
          onClick={onGoBack}
          className="flex items-center justify-center gap-2 border border-border hover:bg-border/30 text-text font-semibold py-2.5 px-6 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Create New Link</span>
        </button>
      </div>
    );
  }

  // Pre-join Room Screen
  if (!joined || !connectionDetails) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        <div className="w-full bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-accent-bg rounded-xl text-accent">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-text-h m-0 text-left">Join Conference</h2>
              <p className="text-xs text-text text-left">Verify credentials to enter meeting room.</p>
            </div>
          </div>

          <div className="space-y-4 mb-6 text-left text-sm bg-bg border border-border p-4 rounded-xl">
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-text">Status:</span>
              <span className="font-semibold text-green-500 capitalize">{linkStatus.status}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-text">Active participants:</span>
              <span className="font-semibold text-text-h">{linkStatus.participantCount}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-text">Expires in:</span>
              <span>
                <CountdownTimer expiresAt={linkStatus.expiresAt} />
              </span>
            </div>
          </div>

          <form onSubmit={join} className="space-y-4 text-left">
            <div className="space-y-2">
              <label htmlFor="participantName" className="flex items-center gap-2 text-sm font-semibold text-text-h">
                <User className="w-4 h-4 text-accent" />
                Enter Your Name
              </label>
              <input
                id="participantName"
                type="text"
                required
                maxLength={50}
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="e.g. Bob Smith"
                disabled={isJoining}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg text-text-h placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition"
              />
            </div>

            {joinError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-sm rounded-xl">
                {joinError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onGoBack}
                disabled={isJoining}
                className="flex-1 border border-border hover:bg-border/30 text-text font-semibold py-3 px-4 rounded-xl text-center transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isJoining}
                className="flex-1 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-accent/25 active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  <>
                    <Spinner size="sm" color="#ffffff" />
                    <span>Joining...</span>
                  </>
                ) : (
                  'Join Room'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Active Conference Room Screen
  return (
    <div className="flex-1 flex flex-col w-full h-[100dvh] bg-[#0c0d12] overflow-hidden" id="livekit-container">
      <LiveKitRoom
        token={connectionDetails.token}
        serverUrl={connectionDetails.url}
        connect={true}
        onDisconnected={leave}
        className="flex-1 flex flex-col h-full"
      >
        <RoomTopBar onLeave={leave} />
        <div className="flex-1 min-h-0 relative">
          <VideoConference />
        </div>
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

interface RoomTopBarProps {
  onLeave: () => void;
}

const RoomTopBar: React.FC<RoomTopBarProps> = ({ onLeave }) => {
  const participants = useParticipants();
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-[#16171d]/90 border-b border-[#2e303a] backdrop-blur-md z-10 text-white">
      <div className="flex items-center gap-3">
        <span className="font-bold text-base tracking-wide text-gray-100">Antigravity Room</span>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-bg border border-accent-border/30 text-accent font-semibold">
          {participants.length} Active
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={copyUrl}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f2028] border border-[#2e303a] hover:bg-[#2e303a] rounded-lg text-sm font-semibold transition active:scale-95 text-gray-200"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              <span>Copied Link</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Invite Others</span>
            </>
          )}
        </button>

        <button
          onClick={onLeave}
          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-semibold transition active:scale-95 text-white"
        >
          Leave
        </button>
      </div>
    </div>
  );
};
