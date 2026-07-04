import { useState } from 'react';

/**
 * Handler hook for managing room chat UI state.
 */
export function useRoomChat() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  const openChat = () => {
    setIsChatOpen(true);
  };

  return {
    isChatOpen,
    toggleChat,
    closeChat,
    openChat,
  };
}
