import { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@livekit/components-react';

/**
 * Custom chat handler hook managing chat history, autocomplete trigger,
 * input state, and key down navigation for mention suggestions.
 */
export function useCustomChat() {
  const { chatMessages, send, isSending } = useChat();

  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const ulRef = useRef<HTMLUListElement>(null);

  const suggestions = useMemo(() => ['@Agent'], []);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    // if (chatMessages.length > 0) {
    //   console.log('[useCustomChat] Received chatMessages (full list):', chatMessages);
    //   console.log('[useCustomChat] Last message details:', JSON.stringify(chatMessages[chatMessages.length - 1], null, 2));
    // }
    if (ulRef.current) {
      ulRef.current.scrollTo({ top: ulRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleInputChange = (val: string) => {
    setInputValue(val);

    const input = inputRef.current;
    if (!input) return;

    const selectionStart = input.selectionStart || 0;
    const textBeforeCursor = val.substring(0, selectionStart);

    // Look for "@" followed by optional word characters up to the cursor
    const match = textBeforeCursor.match(/@(\w*)$/i);
    if (match) {
      const typedText = match[1].toLowerCase();
      // If user typed "@" or "@a", "@ag" etc., suggest "@Agent"
      const matched = suggestions.filter(s => s.toLowerCase().substring(1).startsWith(typedText));
      if (matched.length > 0) {
        setShowSuggestions(true);
        setActiveSuggestionIndex(0);
        return;
      }
    }

    setShowSuggestions(false);
  };

  const applySuggestion = (suggestion: string) => {
    const input = inputRef.current;
    if (!input) return;

    const selectionStart = input.selectionStart || 0;
    const textBeforeCursor = inputValue.substring(0, selectionStart);
    const textAfterCursor = inputValue.substring(selectionStart);

    const match = textBeforeCursor.match(/@(\w*)$/i);
    if (match) {
      const matchIndex = match.index || 0;
      const newTextBefore = textBeforeCursor.substring(0, matchIndex) + suggestion + ' ';
      const newCursorPos = newTextBefore.length;

      setInputValue(newTextBefore + textAfterCursor);
      setShowSuggestions(false);

      // Focus and set selection range after input updates
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applySuggestion(suggestions[activeSuggestionIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed && !isSending) {
      await send(trimmed);
      setInputValue('');
      setShowSuggestions(false);

      // Return focus to input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  return {
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
    setShowSuggestions,
  };
}
