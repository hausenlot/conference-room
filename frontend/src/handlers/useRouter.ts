import { useState, useEffect } from 'react';

export type PageType = 'create' | 'room';

export interface RouteState {
  page: PageType;
  linkId: string | null;
}

/**
 * Parses the current URL to determine the page state and link ID.
 */
export function getRouteInfo(): RouteState {
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);

  // Match /join/:linkId
  const joinMatch = path.match(/^\/join\/([^/]+)/);
  if (joinMatch) {
    return { page: 'room', linkId: joinMatch[1] };
  }

  // Match /room/:linkId
  const roomMatch = path.match(/^\/room\/([^/]+)/);
  if (roomMatch) {
    return { page: 'room', linkId: roomMatch[1] };
  }

  // Match query param ?linkId=xxx
  const queryLinkId = searchParams.get('linkId');
  if (queryLinkId) {
    return { page: 'room', linkId: queryLinkId };
  }

  // Direct ID check: if path is exactly 8 characters of alphanumeric/hyphen/underscore
  const directMatch = path.match(/^\/([a-zA-Z0-9_-]{8})$/);
  if (directMatch) {
    return { page: 'room', linkId: directMatch[1] };
  }

  return { page: 'create', linkId: null };
}

/**
 * Custom React hook handler for state-based routing.
 * Strictly logic-only, to be used in UI components.
 */
export function useRouter() {
  const [route, setRoute] = useState<RouteState>(getRouteInfo());

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteInfo());
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = (path: string) => {
    window.history.pushState(null, '', path);
    setRoute(getRouteInfo());
  };

  return {
    page: route.page,
    linkId: route.linkId,
    navigate,
  };
}
