
import React, { useState, useMemo } from 'react';
import { User, Role, Session, SmartBookingPreferences, ScoredSession, TimeOfDay } from '../types';
import { db } from '../services/DatabaseService';

interface SmartBookingWizardProps {
  currentUser: User;
  users: User[];
  onBookSessions: (sessions: Session[]) => void;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 0, label: 'Sun' },
];

export const SmartBookingWizard: React.FC<SmartBookingWizardProps> = ({ currentUser, users, onBookSessions, onClose }) => {
  const [step, setStep] = useState<'config' | 'review'>('config');
  const [preferences, setPreferences] = useState<SmartBookingPreferences>({
    sessionCount: 1,
    preferredTime: 'Any',
    preferredTeacherId: 'any',
    preferredDays: [0, 1, 2, 3, 4, 5, 6] // Default to all
  });
  const [suggestions, setSuggestions] = useState<ScoredSession[]>([]);
  const [loading, setLoading] = useState(false);

  const teachers = useMemo(() => users.filter(u => u.role === Role.TEACHER), [users]);

  const handleFindMatches = () => {
    setLoading(true);
    // Simulate slight delay for UX
    setTimeout(() => {
      try {
        const results = db.generateSmartSchedule(currentUser.id, preferences);
        setSuggestions(results);
        setStep('review');
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const handleConfirm = () => {
    onBookSessions(suggestions);
  };

  const toggleDay = (dayId: number) => {
      setPreferences(prev => {
          const exists = prev.preferredDays.includes(dayId);
          let newDays;
          if (exists) {
              newDays = prev.preferredDays.filter(d => d !== dayId);
          } else {
              newDays = [...prev.preferredDays, dayId];
          }
          return { ...prev, preferredDays: newDays };
      });
  };

  const toggleAllDays = () => {
      if (preferences.preferredDays.length === 7) {
          setPreferences(prev => ({ ...prev, preferredDays: [] }));
      } else {
          setPreferences(prev => ({ ...prev, preferredDays: [0, 1, 2, 3, 4, 5, 6] }));
      }
  }

  if (step === 'config') {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
          <p><strong>✨ Smart Booking</strong> uses a heuristic algorithm to find the best practice sessions for you over the next 7 days based on your preferences.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
            How many sessions do you want to book?
          </label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="1" 
              max="5" 
              value={preferences.sessionCount} 
              onChange={(e) => setPreferences({...preferences, sessionCount: parseInt(e.target.value)})}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <span className="text-lg font-bold text-primary w-8 text-center">{preferences.sessionCount}</span>
          </div>
        </div>
        
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-white">Preferred Days</label>
                <button onClick={toggleAllDays} className="text-xs text-primary hover:underline">
                    {preferences.preferredDays.length === 7 ? 'Deselect All' : 'Select All'}
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => (
                    <button
                        key={day.id}
                        onClick={() => toggleDay(day.id)}
                        className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                            preferences.preferredDays.includes(day.id)
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                    >
                        {day.label}
                    </button>
                ))}
            </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
            Preferred Time of Day
          </label>
          <select 
            value={preferences.preferredTime}
            onChange={(e) => setPreferences({...preferences, preferredTime: e.target.value as TimeOfDay})}
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"
          >
            <option value="Any">Any Time</option>
            <option value="Morning">Morning (6am - 12pm)</option>
            <option value="Afternoon">Afternoon (12pm - 5pm)</option>
            <option value="Evening">Evening (5pm+)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
            Preferred Instructor
          </label>
          <select 
            value={preferences.preferredTeacherId}
            onChange={(e) => setPreferences({...preferences, preferredTeacherId: e.target.value})}
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"
          >
            <option value="any">No Preference</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md">Cancel</button>
          <button 
            onClick={handleFindMatches} 
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-contrast rounded-md flex items-center"
          >
            {loading ? (
               <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Finding...
               </>
            ) : 'Find Matches'}
          </button>
        </div>
      </div>
    );
  }

  // Review Step
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">We found {suggestions.length} matches</h3>
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No matching sessions found based on your criteria.</p>
            <p className="text-sm mt-2">Try adjusting your preferences or checking back later.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {suggestions.map(session => (
              <div key={session.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white">
                      {session.start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {session.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {session.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Instructor: {session.teacherName}</p>
                  </div>
                  {session.matchReasons.length > 0 && (
                     <div className="flex flex-col items-end gap-1">
                        {session.matchReasons.map((r, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                {r}
                            </span>
                        ))}
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 flex justify-end gap-3">
        <button onClick={() => setStep('config')} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md">Back</button>
        {suggestions.length > 0 && (
            <button onClick={handleConfirm} className="px-4 py-2 bg-primary text-primary-contrast rounded-md">
            Confirm & Book All ({suggestions.length})
            </button>
        )}
      </div>
    </div>
  );
};
