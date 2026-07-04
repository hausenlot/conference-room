import { useState } from 'react';
import { ApiService } from '../services/api.service';

/**
 * Handler hook for managing AI agent dispatching state and actions.
 */
export function useAgentDispatcher() {
  const [isDispatching, setIsDispatching] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const dispatchAgent = async (roomName: string, identity: string, name?: string) => {
    if (!roomName || !identity) {
      setDispatchError('Missing room name or participant identity');
      return;
    }

    setIsDispatching(true);
    setDispatchError(null);
    try {
      await ApiService.dispatchAgent(roomName, identity, name);
      setIsDispatched(true);
    } catch (err: any) {
      setDispatchError(err.message || 'Failed to dispatch agent');
    } finally {
      setIsDispatching(false);
    }
  };

  return {
    isDispatching,
    isDispatched,
    dispatchError,
    dispatchAgent,
  };
}
