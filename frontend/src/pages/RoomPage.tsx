import React, { useState } from 'react';
import { useRoomJoiner } from '../handlers/useRoomJoiner';
import { useAgentDispatcher } from '../handlers/useAgentDispatcher';
import { useRoomChat } from '../handlers/useRoomChat';
import { Spinner } from '../components/Spinner';
import { CountdownTimer } from '../components/CountdownTimer';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  GridLayout,
  ParticipantTile,
  ControlBar,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Copy, Check, Video, User, ShieldAlert, ArrowLeft, Bot, Sparkles, MessageSquare } from 'lucide-react';
import { CustomChat } from '../components/CustomChat';


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

  const { isChatOpen, toggleChat } = useRoomChat();

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
        className="flex-1 flex flex-col h-full min-h-0 overflow-hidden"
      >
        <RoomTopBar
          onLeave={leave}
          roomName={connectionDetails.roomName}
          identity={connectionDetails.participantIdentity}
          name={participantName}
          isChatOpen={isChatOpen}
          onToggleChat={toggleChat}
        />
        <CustomActiveConference isChatOpen={isChatOpen} onToggleChat={toggleChat} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

interface CustomActiveConferenceProps {
  isChatOpen: boolean;
  onToggleChat: () => void;
}

const CustomActiveConference: React.FC<CustomActiveConferenceProps> = ({ isChatOpen, onToggleChat }) => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const participants = useParticipants();

  React.useEffect(() => {
    const debugList = participants.map((p) => ({
      identity: p.identity,
      name: p.name || 'N/A',
      isLocal: p.isLocal,
      metadata: p.metadata || 'None',
      connectionQuality: p.connectionQuality,
    }));
    console.log('[DEBUG] Active Participants List:');
    console.table(debugList);
  }, [participants]);

  return (
    <div className="flex-1 min-h-0 flex flex-row w-full bg-[#0c0d12] overflow-hidden">
      {/* Main Video & Controls area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Grid of participants using LiveKit's native GridLayout */}
        <div className="flex-1 min-h-0 relative">
          <GridLayout tracks={tracks} className="absolute inset-0">
            <ParticipantTile />
          </GridLayout>
        </div>

        {/* Control Bar */}
        <div className="px-6 py-4 bg-[#16171d]/90 border-t border-[#2e303a] backdrop-blur-md flex justify-center items-center">
          <ControlBar controls={{ chat: false, settings: false }} />
        </div>
      </div>

      {/* Sidebar Chat Box */}
      <div className={`w-80 md:w-96 flex-col h-full min-h-0 bg-[#111218] border-l border-[#2e303a] overflow-hidden animate-slide-in ${isChatOpen ? 'flex' : 'hidden'}`}>
        <CustomChat onClose={onToggleChat} />
      </div>
    </div>
  );
};

interface RoomTopBarProps {
  onLeave: () => void;
  roomName: string;
  identity: string;
  name?: string;
  isChatOpen: boolean;
  onToggleChat: () => void;
}

const RoomTopBar: React.FC<RoomTopBarProps> = ({
  onLeave,
  roomName,
  identity,
  name,
  isChatOpen,
  onToggleChat,
}) => {
  const participants = useParticipants();
  const [copied, setCopied] = useState(false);

  const { isDispatching, isDispatched, dispatchError, dispatchAgent } = useAgentDispatcher();

  const isAgentInRoom = participants.some(p =>
    p.identity.toLowerCase().includes('agent') ||
    (p.name && p.name.toLowerCase().includes('agent'))
  );

  const hasAgent = isDispatched || isAgentInRoom;

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
    <div className="flex items-center justify-between px-6 py-4 bg-[#16171d]/90 border-b border-[#2e303a] backdrop-blur-md z-10 text-white relative">
      <div className="flex items-center gap-3">
        <span className="font-bold text-base tracking-wide text-gray-100">Room</span>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-bg border border-accent-border/30 text-accent font-semibold">
          {participants.length} Active
        </span>
      </div>

      {/* Add a button here for the endpoint /api/token */}
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!hasAgent) {
              dispatchAgent(roomName, identity, name);
            }
          }}
          disabled={hasAgent || isDispatching}
          className={`
            px-5 py-2 rounded-xl font-semibold shadow-md transition-all duration-200 active:scale-95
            flex items-center gap-2 border text-sm
            ${hasAgent
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-not-allowed shadow-none'
              : isDispatching
                ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]/40 text-[#8b5cf6]/70 cursor-wait'
                : 'bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 border-[#8b5cf6]/30 hover:border-[#8b5cf6]/50 text-white shadow-[#8b5cf6]/5 hover:shadow-[#8b5cf6]/15 cursor-pointer'
            }
          `}
        >
          {hasAgent ? (
            <>
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>AI Agent Active</span>
            </>
          ) : isDispatching ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-[#8b5cf6]" />
              <span>Invoking Agent...</span>
            </>
          ) : (
            <>
              <Bot className="w-4 h-4 text-[#8b5cf6]" />
              <span>Call AI Agent</span>
            </>
          )}
        </button>

        {dispatchError && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 z-50 text-[10px] text-red-400 bg-[#16171d] border border-red-500/30 px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap">
            {dispatchError}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleChat}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition active:scale-95 ${isChatOpen
            ? 'bg-accent border border-accent text-white hover:bg-accent/90'
            : 'bg-[#1f2028] border border-[#2e303a] hover:bg-[#2e303a] text-gray-200 shadow-md'
            }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </button>

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
