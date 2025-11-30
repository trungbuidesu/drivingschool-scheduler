
import React, { useState, useEffect, useRef } from 'react';
import { User, Notification } from '../types';
import { Avatar } from './Avatar';

interface HeaderProps {
  onLogout: () => void;
  currentUser: User | null;
  notifications: Notification[];
  onMarkNotificationsRead: () => void;
  onToggleSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, currentUser, notifications, onMarkNotificationsRead, onToggleSettings }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
    if (!isDropdownOpen && unreadCount > 0) {
      onMarkNotificationsRead();
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary dark:text-white">
          DriveTime Scheduler
        </h1>
        <div className="flex items-center space-x-4">
          {currentUser && (
            <div className="relative" ref={dropdownRef}>
              <button onClick={handleToggleDropdown} className="relative text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-blue-400 focus:outline-none" aria-label="Notifications">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden z-20">
                  <div className="py-2 px-4 font-bold text-gray-800 dark:text-white border-b dark:border-gray-700">Notifications</div>
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <li key={n.id} className={`p-3 text-sm ${!n.read ? 'bg-blue-50 dark:bg-gray-700' : ''}`}>
                          <p className="text-gray-700 dark:text-gray-300">{n.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                        </li>
                      ))
                    ) : (
                      <li className="p-4 text-center text-gray-500 dark:text-gray-400">No new notifications</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
           <button
            onClick={onToggleSettings}
            className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded-full"
            aria-label="Open user settings"
          >
            <Avatar user={currentUser} />
          </button>
          <button
            onClick={onLogout}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-danger dark:hover:text-red-400 focus:outline-none"
            aria-label="Logout"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
