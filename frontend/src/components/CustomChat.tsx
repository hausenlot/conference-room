import React from 'react';
import { useCustomChat } from '../handlers/useCustomChat';
import { formatChatMessage } from '../services/chatFormatter';
import { Bot, X } from 'lucide-react';
import { useLocalParticipant } from '@livekit/components-react';

interface CustomChatProps {
  onClose?: () => void;
}

export const CustomChat: React.FC<CustomChatProps> = ({ onClose }) => {
  const { localParticipant } = useLocalParticipant();
  const {
    chatMessages,
    isSending,
    inputValue,
    showSuggestions,
    activeSuggestionIndex,
    suggestions,
    inputRef,
    ulRef,
    handleInputChange,
    handleKeyDown,
    applySuggestion,
    handleSubmit,
  } = useCustomChat();

  return (
    <div className="lk-chat flex flex-col h-full max-h-full min-h-0 w-full bg-[#111218] border-l border-[#2e303a] overflow-hidden">
      {/* Custom Chat Header */}
      <div className="lk-chat-header h-[60px] w-full flex items-center justify-between px-5 bg-[#16171d] border-b border-[#2e303a] text-gray-100 font-semibold text-sm">
        <span>Messages</span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2e303a] text-gray-400 hover:text-gray-200 transition"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages List */}
      <ul className="lk-list lk-chat-messages flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3" ref={ulRef}>
        {chatMessages.map((msg, idx, allMsg) => {
          const isTranscription = (msg as any).isTranscription;
          const senderIdentity = (msg as any).senderIdentity;
          const isLocal =
            msg.from?.isLocal ||
            (isTranscription &&
              (!senderIdentity || senderIdentity === localParticipant?.identity));
          const isAgent =
            !isTranscription &&
            (msg.from?.identity?.toLowerCase().includes('agent') ||
              msg.from?.name?.toLowerCase().includes('agent'));
          const hasAgentMention = msg.message.includes('@Agent');

          const prevMsg = idx >= 1 ? allMsg[idx - 1] : null;
          const prevIsTranscription = prevMsg ? (prevMsg as any).isTranscription : false;
          const currentSenderId = isTranscription ? senderIdentity : msg.from?.identity;
          const prevSenderId = prevMsg
            ? (prevIsTranscription ? (prevMsg as any).senderIdentity : prevMsg.from?.identity)
            : null;
          const hideName =
            idx >= 1 &&
            prevSenderId === currentSenderId &&
            prevIsTranscription === isTranscription;

          const hideTimestamp =
            idx >= 1 && msg.timestamp - allMsg[idx - 1].timestamp < 60_000 && hideName;

          const name = isTranscription
            ? (isLocal ? 'You' : ((msg as any).senderName ?? 'Participant'))
            : (msg.from?.name ?? msg.from?.identity ?? 'Unknown');
          const time = new Date(msg.timestamp);
          const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
          const formattedTime = time.toLocaleTimeString(locale, { timeStyle: 'short' });

          // Determine coloring based on sender type & contents
          let messageBubbleClass = '';
          if (isLocal) {
            if (hasAgentMention) {
              messageBubbleClass =
                'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border border-violet-400/30 shadow-[0_0_12px_rgba(139,92,246,0.2)] rounded-br-sm';
            } else {
              messageBubbleClass = 'bg-[#8b5cf6] text-white rounded-br-sm';
            }
          } else {
            if (isAgent) {
              messageBubbleClass =
                'bg-[#1b1230]/90 border border-violet-500/30 text-violet-100 shadow-[0_0_10px_rgba(139,92,246,0.05)] rounded-bl-sm';
            } else {
              messageBubbleClass =
                'bg-[#1f2028] text-gray-200 border border-white/5 rounded-bl-sm';
            }
          }

          return (
            <li
              key={msg.id ?? idx}
              className={`flex flex-col gap-1 max-w-[85%] ${isLocal ? 'self-end items-end' : 'self-start items-start'}`}
            >
              {/* Meta Data (Name & Timestamp) */}
              {(!hideName || !hideTimestamp) && (
                <span className="flex items-center gap-2 px-1 text-[11px] font-medium text-gray-400">
                  {!hideName && (
                    <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                      {name}
                      {isAgent && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30">
                          <Bot className="w-3 h-3 text-violet-300" />
                          AI Agent
                        </span>
                      )}
                    </span>
                  )}
                  {!hideTimestamp && <span>{formattedTime}</span>}
                </span>
              )}

              {/* Message Content with Custom Formatter */}
              <div className={`inline-block rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed break-words max-w-full ${messageBubbleClass}`}>
                {formatChatMessage(msg.message)}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Autocomplete suggestions and Input Form */}
      <div className="relative w-full bg-[#16171d] border-t border-[#2e303a]">
        {showSuggestions && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#16171d] border border-[#2e303a] rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 text-[10px] font-bold text-gray-500 border-b border-[#2e303a]">
              SUGGESTED MENTIONS
            </div>
            <ul>
              {suggestions.map((suggestion, idx) => (
                <li
                  key={suggestion}
                  onClick={() => applySuggestion(suggestion)}
                  className={`px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2 transition duration-150 ${
                    idx === activeSuggestionIndex
                      ? 'bg-[#8b5cf6] text-white font-semibold'
                      : 'text-gray-200 hover:bg-[#2e303a]'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>{suggestion}</span>
                  <span className="ml-auto text-[10px] opacity-60">AI Assistant</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form className="lk-chat-form p-4 flex gap-2 items-center" onSubmit={handleSubmit}>
          <input
            className="lk-chat-form-input flex-1 bg-[#0b0c10] border border-[#2e303a] text-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none transition focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20"
            disabled={isSending}
            ref={inputRef}
            type="text"
            placeholder="Enter a message... (Type @Agent to chat)"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
          />
          <button
            type="submit"
            className="lk-chat-form-button bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl px-4 py-2.5 h-10 transition duration-150"
            disabled={isSending || !inputValue.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
