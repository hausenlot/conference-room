import { useState } from 'react';
import { ApiService, type LinkResponse } from '../services/api.service';

export type ExpiryOption = '1h' | '6h' | '12h' | '24h' | '3d' | '7d';

const expiryToHoursMap: Record<ExpiryOption, number> = {
  '1h': 1,
  '6h': 6,
  '12h': 12,
  '24h': 24,
  '3d': 72,
  '7d': 168,
};

const getAbsoluteUrl = (url: string): string => {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${window.location.origin}${url}`;
  }
  return `${window.location.protocol}//${url}`;
};

/**
 * Hook handler for creating conference links.
 * Pure logic separation.
 */
export function useLinkCreator() {
  const [creatorName, setCreatorName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number>(20);
  const [expiry, setExpiry] = useState<ExpiryOption>('24h');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<LinkResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const createConferenceLink = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setStatus('loading');
    setError(null);

    try {
      const hours = expiryToHoursMap[expiry];
      const result = await ApiService.createLink(
        creatorName.trim() || undefined,
        maxParticipants,
        hours
      );
      setCreatedLink(result);
      setStatus('success');
    } catch (err: any) {
      setError(err.message || 'Failed to create conference link');
      setStatus('error');
    }
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleJoin = () => {
    if (!createdLink) return;
    const absoluteUrl = getAbsoluteUrl(createdLink.url);
    window.open(absoluteUrl, '_blank');
  };

  const resetCreator = () => {
    setCreatorName('');
    setMaxParticipants(20);
    setExpiry('24h');
    setStatus('idle');
    setError(null);
    setCreatedLink(null);
    setCopied(false);
  };

  return {
    creatorName,
    setCreatorName,
    maxParticipants,
    setMaxParticipants,
    expiry,
    setExpiry,
    status,
    error,
    createdLink,
    copied,
    createConferenceLink,
    handleCopy,
    handleJoin,
    resetCreator,
  };
}
