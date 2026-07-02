import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'currentColor',
  className = '',
}) => {
  const dimensions = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-t-transparent ${dimensions[size]} ${className}`}
      style={{
        borderColor: `${color} transparent transparent transparent`,
        borderStyle: 'solid',
      }}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
