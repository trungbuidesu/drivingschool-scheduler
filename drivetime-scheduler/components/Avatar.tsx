
import React from 'react';
import { User } from '../types';

interface AvatarProps {
  user: User | null;
  size?: 'sm' | 'md' | 'lg';
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({ user, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-20 w-20 text-2xl',
  };

  if (!user) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold`}>
        ?
      </div>
    );
  }

  return (
    <div className={`rounded-full overflow-hidden ${sizeClasses[size]} bg-primary flex-shrink-0`}>
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={`${user.name}'s avatar`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-blue-500 text-white font-bold">
          {getInitials(user.name)}
        </div>
      )}
    </div>
  );
};
