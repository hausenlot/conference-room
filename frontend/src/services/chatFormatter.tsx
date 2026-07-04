import React from 'react';

/**
 * Parses and formats a message containing markdown formatting:
 * - Newlines and paragraphs.
 * - Bold text (**bold**)
 * - Highlighted tag (@Agent)
 * - Bullet lists (* / - / +)
 * - Numbered lists (1., 2. etc.)
 * - Standard links (http/https/mailto)
 */
export function formatChatMessage(message: string): React.ReactNode {
  if (!message) return null;

  // Split the message by newlines
  const lines = message.split('\n');
  const elements: React.ReactNode[] = [];
  
  let currentListItems: React.ReactNode[] = [];
  let currentListType: 'ul' | 'ol' | null = null;
  let keyCounter = 0;

  // Render inline styles: bold (**text**), @Agent tag, and links
  const renderInline = (text: string): React.ReactNode[] => {
    // Regex matching:
    // 1. @Agent (case insensitive)
    // 2. Bold: **text**
    // 3. URLs: http/https or email or www
    const regex = /(@Agent)|\*\*([^*]+)\*\*|(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      
      // Push leading text
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      if (match[1]) {
        // @Agent tag
        parts.push(
          <span
            key={`agent-${keyCounter++}`}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/40 text-violet-300 font-bold text-xs mx-0.5"
          >
            @Agent
          </span>
        );
      } else if (match[2]) {
        // Bold text
        parts.push(
          <strong key={`bold-${keyCounter++}`} className="font-semibold text-gray-100">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // Link
        const url = match[3];
        const href = url.startsWith('http') ? url : `https://${url}`;
        parts.push(
          <a
            key={`link-${keyCounter++}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-violet-400 hover:text-violet-300 underline break-all"
          >
            {url}
          </a>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const flushList = () => {
    if (currentListItems.length > 0) {
      if (currentListType === 'ul') {
        elements.push(
          <ul key={`list-ul-${keyCounter++}`} className="list-disc pl-5 my-1.5 space-y-1 text-left text-gray-300">
            {currentListItems}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-ol-${keyCounter++}`} className="list-decimal pl-5 my-1.5 space-y-1 text-left text-gray-300">
            {currentListItems}
          </ol>
        );
      }
      currentListItems = [];
      currentListType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      flushList();
      elements.push(<div key={`empty-${keyCounter++}`} className="h-2" />);
      continue;
    }

    // Check for bullet list item: starts with whitespace followed by *, - or + and space
    const bulletMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bulletMatch) {
      if (currentListType !== 'ul') {
        flushList();
        currentListType = 'ul';
      }
      currentListItems.push(
        <li key={`li-${keyCounter++}`} className="text-left text-[13.5px] leading-relaxed">
          {renderInline(bulletMatch[1])}
        </li>
      );
      continue;
    }

    // Check for numbered list item: starts with whitespace followed by digits, dot and space
    const numberMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (numberMatch) {
      if (currentListType !== 'ol') {
        flushList();
        currentListType = 'ol';
      }
      currentListItems.push(
        <li key={`li-${keyCounter++}`} className="text-left text-[13.5px] leading-relaxed">
          {renderInline(numberMatch[2])}
        </li>
      );
      continue;
    }

    // Otherwise, it is a paragraph
    flushList();
    elements.push(
      <p key={`p-${keyCounter++}`} className="text-left text-[13.5px] leading-relaxed my-1 text-gray-300">
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  return <div className="space-y-0.5">{elements}</div>;
}
