
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { Avatar } from './Avatar';
import { toast } from 'react-hot-toast';

type Theme = 'light' | 'dark';

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onUpdateUser: (updates: Partial<User>) => void;
}

const AVATAR_PRESETS = [
    'https://i.pravatar.cc/150?u=1',
    'https://i.pravatar.cc/150?u=2',
    'https://i.pravatar.cc/150?u=3',
    'https://i.pravatar.cc/150?u=4',
    'https://i.pravatar.cc/150?u=5',
    'https://i.pravatar.cc/150?u=6',
    'https://i.pravatar.cc/150?u=7',
    'https://i.pravatar.cc/150?u=8',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
];

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ isOpen, onClose, user, theme, onThemeChange, onUpdateUser }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [primaryColor, setPrimaryColor] = useState(user.themeColors?.primary || '#007BFF');
  const [secondaryColor, setSecondaryColor] = useState(user.themeColors?.secondary || '#6C757D');
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(user.firstDayOfWeek || 0);
  
  // Teacher Constraints
  const [dailyLimit, setDailyLimit] = useState<number | ''>(user.teacherConstraints?.maxSessionsPerLearnerDaily || '');
  const [weeklyLimit, setWeeklyLimit] = useState<number | ''>(user.teacherConstraints?.maxSessionsPerLearnerWeekly || '');

  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  // Reset local state when user prop changes or sidebar opens
  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setEmail(user.email);
      setAvatarUrl(user.avatarUrl || '');
      setPrimaryColor(user.themeColors?.primary || '#007BFF');
      setSecondaryColor(user.themeColors?.secondary || '#6C757D');
      setFirstDayOfWeek(user.firstDayOfWeek || 0);
      setDailyLimit(user.teacherConstraints?.maxSessionsPerLearnerDaily || '');
      setWeeklyLimit(user.teacherConstraints?.maxSessionsPerLearnerWeekly || '');
      setNewPassword('');
      setConfirmPassword('');
      setIsAvatarPickerOpen(false);
    }
  }, [isOpen, user]);

  const handleSaveChanges = () => {
    if (!name.trim()) {
        toast.error("Name cannot be empty");
        return;
    }
    if (!email.trim() || !email.includes('@')) {
        toast.error("Please enter a valid email address");
        return;
    }

    const updates: Partial<User> = {
        name,
        email,
        avatarUrl,
        themeColors: {
            primary: primaryColor,
            secondary: secondaryColor
        },
        firstDayOfWeek
    };

    if (user.role === Role.TEACHER) {
        updates.teacherConstraints = {
            maxSessionsPerLearnerDaily: dailyLimit === '' ? undefined : Number(dailyLimit),
            maxSessionsPerLearnerWeekly: weeklyLimit === '' ? undefined : Number(weeklyLimit),
        };
    }

    if (newPassword) {
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters long");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        updates.password = newPassword;
    }

    onUpdateUser(updates);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black z-30 transition-opacity duration-300 ${isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 id="settings-title" className="text-xl font-bold text-gray-800 dark:text-white">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close settings panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-grow p-6 space-y-6 overflow-y-auto">
            <div className="flex flex-col items-center space-y-2 relative">
              {/* Avatar Wrapper */}
              <div className="relative group cursor-pointer" onClick={() => setIsAvatarPickerOpen(true)}>
                  <Avatar user={{ ...user, name: name, avatarUrl: avatarUrl }} size="lg" />
                  <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
              </div>
              <p className="text-xs text-primary cursor-pointer hover:underline" onClick={() => setIsAvatarPickerOpen(true)}>Change Avatar</p>
              
              <h3 className="text-lg font-semibold dark:text-white">{name}</h3>
              <p className="text-sm text-gray-500 dark:text-white">{email}</p>
            </div>

            {/* Profile Form */}
            <div className="space-y-4">
               <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-white">Full Name</label>
                    <input 
                        type="text" 
                        id="name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"
                    />
                </div>
                 <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white">Email Address</label>
                    <input 
                        type="email" 
                        id="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"
                    />
                </div>
            </div>

            {/* Teacher Constraints - "Make Me Busy" */}
            {user.role === Role.TEACHER && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                    <h4 className="font-semibold text-gray-800 dark:text-white flex items-center">
                        <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Availability Limits
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Limit how many sessions a single learner can book with you.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="dailyLimit" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Max Daily per Learner</label>
                            <input 
                                type="number" 
                                id="dailyLimit" 
                                min="0"
                                placeholder="No limit"
                                value={dailyLimit}
                                onChange={(e) => setDailyLimit(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="weeklyLimit" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Max Weekly per Learner</label>
                            <input 
                                type="number" 
                                id="weeklyLimit"
                                min="0"
                                placeholder="No limit" 
                                value={weeklyLimit}
                                onChange={(e) => setWeeklyLimit(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}
            
            {/* Calendar Preferences */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                <h4 className="font-semibold text-gray-800 dark:text-white">Calendar Settings</h4>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">First Day of Week</label>
                    <div className="flex gap-4">
                        <label className="inline-flex items-center cursor-pointer">
                            <input 
                                type="radio" 
                                className="form-radio text-primary focus:ring-primary" 
                                name="firstDay" 
                                value={0} 
                                checked={firstDayOfWeek === 0}
                                onChange={() => setFirstDayOfWeek(0)}
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-white">Sunday</span>
                        </label>
                        <label className="inline-flex items-center cursor-pointer">
                            <input 
                                type="radio" 
                                className="form-radio text-primary focus:ring-primary" 
                                name="firstDay" 
                                value={1} 
                                checked={firstDayOfWeek === 1}
                                onChange={() => setFirstDayOfWeek(1)}
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-white">Monday</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Theme Customization */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                <h4 className="font-semibold text-gray-800 dark:text-white">Theme Customization</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Primary Color</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="color" 
                                id="primaryColor" 
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="h-8 w-8 rounded border border-gray-300 cursor-pointer"
                            />
                            <span className="text-xs text-gray-500 dark:text-white">{primaryColor}</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Secondary Color</label>
                         <div className="flex items-center gap-2">
                            <input 
                                type="color" 
                                id="secondaryColor" 
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                                className="h-8 w-8 rounded border border-gray-300 cursor-pointer"
                            />
                            <span className="text-xs text-gray-500 dark:text-white">{secondaryColor}</span>
                        </div>
                    </div>
                </div>
            </div>


             {/* Password Change Section */}
             <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                <h4 className="font-semibold text-gray-800 dark:text-white">Change Password</h4>
                 <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-white">New Password</label>
                    <input 
                        type="password" 
                        id="newPassword" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"
                    />
                </div>
                {newPassword && (
                     <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-white">Confirm New Password</label>
                        <input 
                            type="password" 
                            id="confirmPassword" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`mt-1 block w-full p-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary focus:border-primary ${
                                confirmPassword && newPassword !== confirmPassword 
                                ? 'border-red-500 dark:border-red-500' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                        )}
                    </div>
                )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-semibold mb-2 text-gray-800 dark:text-white">Theme Mode</h4>
              <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium dark:text-white">Toggle Light/Dark Mode</span>
                <button
                  onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSaveChanges}
              className="w-full bg-primary text-primary-contrast py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300"
            >
              Save Changes
            </button>
          </div>
        </div>
      </aside>

      {/* Avatar Picker Modal */}
      {isAvatarPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setIsAvatarPickerOpen(false)}>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Choose an Avatar</h3>
                    <button onClick={() => setIsAvatarPickerOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {AVATAR_PRESETS.map((url, index) => (
                        <button 
                            key={index} 
                            onClick={() => { setAvatarUrl(url); setIsAvatarPickerOpen(false); }}
                            className={`rounded-full overflow-hidden border-2 transition-all ${avatarUrl === url ? 'border-primary scale-110' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                        >
                            <img src={url} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                     <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Or enter a custom URL</label>
                     <div className="flex">
                        <input 
                            type="text" 
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="https://..."
                            className="flex-grow p-2 border border-gray-300 rounded-l-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary text-sm"
                        />
                        <button 
                            onClick={() => setIsAvatarPickerOpen(false)}
                            className="bg-primary text-white px-4 py-2 rounded-r-md hover:bg-blue-700 text-sm"
                        >
                            Set
                        </button>
                     </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};
