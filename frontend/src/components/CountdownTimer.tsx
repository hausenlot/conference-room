import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiresAt, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const expiresTime = new Date(expiresAt).getTime();

    const calculateTimeLeft = () => {
      const difference = expiresTime - Date.now();

      if (difference <= 0) {
        setTimeLeft('Expired');
        if (onExpire) {
          onExpire();
        }
        return false;
      }

      const totalSeconds = Math.floor(difference / 1000);
      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const parts: string[] = [];
      if (days > 0) {
        parts.push(`${days}d`);
      }
      if (days > 0 || hours > 0) {
        parts.push(`${hours}h`);
      }
      if (days > 0 || hours > 0 || minutes > 0) {
        parts.push(`${minutes}m`);
      }
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(' '));
      return true;
    };

    // Calculate immediately
    const isRunning = calculateTimeLeft();
    if (!isRunning) return;

    const timer = setInterval(() => {
      const running = calculateTimeLeft();
      if (!running) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  return (
    <span className="font-mono text-accent font-semibold" aria-live="polite">
      {timeLeft}
    </span>
  );
};
