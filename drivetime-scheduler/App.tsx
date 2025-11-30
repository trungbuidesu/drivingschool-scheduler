
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Role, User, Session, SessionStatus, Notification, Vehicle, SessionType } from './types';
import { Header } from './components/Header';
import { AdminDashboard } from './components/AdminDashboard';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { Modal } from './components/Modal';
import { Auth } from './components/Auth';
import { SettingsSidebar } from './components/SettingsSidebar';
import { SmartBookingWizard } from './components/SmartBookingWizard';
import { SessionHistory } from './components/SessionHistory';
import { Toaster, toast } from 'react-hot-toast';
import { SessionCard } from './components/SessionCard';
// Import the database singleton
import { db } from './services/DatabaseService';

type ModalType = 'create' | 'viewDetails' | 'viewGroup' | 'smartBooking';
type ModalView = 'details' | 'cancel' | 'unsavedChanges' | 'history';
interface ModalState {
  type: ModalType | null;
  view: ModalView;
  data: any; 
}

const toDateTimeLocal = (date: Date): string => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
};

// Helper to calculate contrast color (YIQ)
const getContrastYIQ = (hexcolor: string) => {
    if (!hexcolor) return 'white';
    hexcolor = hexcolor.replace('#', '');
    var r = parseInt(hexcolor.substr(0, 2), 16);
    var g = parseInt(hexcolor.substr(2, 2), 16);
    var b = parseInt(hexcolor.substr(4, 2), 16);
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  // State is now synchronized from the DB Service
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // UI State
  const [modalState, setModalState] = useState<ModalState>({ type: null, view: 'details', data: null });
  const [editedSessionData, setEditedSessionData] = useState<Partial<Session> & { duration?: number } | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  const navigate = useNavigate();
  const location = useLocation();

  // Initial Data Load
  useEffect(() => {
    refreshData();
  }, [currentUser]);

  const refreshData = () => {
    setUsers(db.getUsers());
    setSessions(db.getSessions());
    setVehicles(db.getVehicles());
    if (currentUser) {
        setNotifications(db.getNotifications(currentUser.id));
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    
    let primaryColor = '#007BFF';
    let secondaryColor = '#6C757D';

    // Dynamic Theme Application
    if (currentUser?.themeColors) {
        primaryColor = currentUser.themeColors.primary;
        secondaryColor = currentUser.themeColors.secondary;
    }

    root.style.setProperty('--color-primary', primaryColor);
    root.style.setProperty('--color-primary-contrast', getContrastYIQ(primaryColor));
    root.style.setProperty('--color-secondary', secondaryColor);
    
  }, [theme, currentUser?.themeColors]);

  const currentRole = useMemo(() => currentUser?.role ?? Role.ANONYMOUS, [currentUser]);

  // Automated Status Updates via DB
  useEffect(() => {
    const interval = setInterval(() => {
        const { changed } = db.updateSessionStatuses();
        if (changed) {
            refreshData();
        }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Form Handling Logic
  useEffect(() => {
    if (modalState.type && modalState.data) {
        setEditedSessionData({ ...modalState.data });
    } else {
        setEditedSessionData(null);
    }
    setCancellationReason('');
  }, [modalState.type, modalState.data]);
  
  const initialDataRef = React.useRef<Partial<Session> | null>(null);
  useEffect(() => {
      if (modalState.type === 'viewDetails' || modalState.type === 'create') {
        initialDataRef.current = modalState.data;
      }
      if (!editedSessionData || !initialDataRef.current) {
          setIsDirty(false);
          return;
      }
      setIsDirty(!deepEqual(initialDataRef.current, editedSessionData));
  }, [editedSessionData, modalState.type, modalState.data]);

  const closeModal = () => {
    if (isDirty) {
        setModalState(prev => ({ ...prev, view: 'unsavedChanges' }));
        return;
    }
    setModalState({ type: null, view: 'details', data: null });
  };

  const confirmClose = () => {
    setIsDirty(false);
    setModalState({ type: null, view: 'details', data: null });
  }

  // --- Actions delegated to DatabaseService ---

  const handleLogin = (email: string, password: string) => {
    try {
        const user = db.authenticate(email, password);
        if (user) {
            setCurrentUser(user);
            toast.success(`Welcome back, ${user.name}!`);
            const from = (location.state as any)?.from?.pathname || (user.role === Role.ADMIN ? '/admin' : '/schedule');
            navigate(from, { replace: true });
        } else {
            toast.error("Invalid credentials. Please try again.");
        }
    } catch (e: any) {
        toast.error(e.message, { duration: 5000 });
    }
  };

  const handleRegister = (name: string, email: string, password: string) => {
    try {
        const newUser = db.registerUser(name, email, password);
        setCurrentUser(newUser);
        refreshData();
        toast.success('Registration successful!');
        navigate('/schedule');
    } catch (e: any) {
        toast.error(e.message);
    }
  };

  const handleUpdateUser = (updates: Partial<User>) => {
      if (!currentUser) return;
      try {
          const updatedUser = db.updateUser(currentUser.id, updates);
          setCurrentUser(updatedUser); // Update local state immediately
          refreshData(); // Sync lists
          toast.success("Profile updated successfully");
      } catch (e: any) {
          toast.error(e.message);
      }
  }

  const handleLogout = () => { setCurrentUser(null); toast('You have been logged out.'); navigate('/login'); };

  const handleCreateSession = () => {
    if (!currentUser) return;
    if (!editedSessionData?.start) return;

    if (new Date(editedSessionData.start) < new Date()) {
        toast.error("You cannot create a session in the past.");
        return;
    }

    try {
        db.createSession(editedSessionData as Partial<Session>, currentUser);
        refreshData();
        toast.success('A new session has been created.');
        setIsDirty(false); 
        closeModal();
    } catch (e: any) {
        toast.error(e.message);
    }
  };
  
  const handleBookSession = (sessionId: string) => {
    if (!currentUser) return;
    try {
        db.bookSession(sessionId, currentUser);
        refreshData();
        toast.success(`Session booked successfully.`);
        closeModal();
    } catch (e: any) {
        toast.error(e.message);
    }
  };

  const handleSmartBookingConfirm = (sessionsToBook: Session[]) => {
      if (!currentUser) return;
      let bookedCount = 0;
      sessionsToBook.forEach(s => {
          try {
              db.bookSession(s.id, currentUser);
              bookedCount++;
          } catch (e) {
              console.error(`Failed to book ${s.id}`, e);
          }
      });
      refreshData();
      toast.success(`${bookedCount} sessions booked successfully!`);
      closeModal();
  };

  const handleCancelSession = (sessionId: string, reason: string) => {
    if (!currentUser) return;
    if (currentUser.role === Role.LEARNER && !reason) { toast.error("A reason for cancellation is required."); return; }
    
    try {
        db.cancelSession(sessionId, currentUser, reason);
        refreshData();
        toast.success(`Session updated.`);
        closeModal();
    } catch (e: any) {
        toast.error(e.message);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!currentUser) return;
    try {
        db.deleteSession(sessionId, currentUser);
        refreshData();
        toast.success(`Session deleted.`);
        closeModal();
    } catch (e: any) {
        toast.error(e.message);
    }
  };
  
  const handleMarkDone = (sessionId: string) => {
      if(!currentUser) return;
      try {
          db.markSessionFinished(sessionId, currentUser);
          refreshData();
          toast.success(`Session marked as finished.`);
          closeModal();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  const handleUpdateSession = () => {
      if (!currentUser || !editedSessionData?.id) return;
      try {
          const updated = db.updateSession(editedSessionData.id, editedSessionData, currentUser);
          refreshData();
          toast.success('Session updated successfully!');
          setModalState(prev => ({...prev, data: updated}));
      } catch (e: any) {
          toast.error(e.message);
      }
  };
  
  const handleUpdateSessionTime = (sessionId: string, start: Date, end: Date) => {
      if (!currentUser) return;
      try {
          db.updateSession(sessionId, { start, end }, currentUser);
          refreshData();
          toast.success('Session rescheduled successfully!');
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  const handleMarkNotificationsRead = () => {
    if (!currentUser) return;
    db.markNotificationsRead(currentUser.id);
    refreshData();
  };
  
  // --- UI Rendering Logic ---
  
  const getModalTitle = (): string => {
    switch (modalState.type) {
      case 'create': return 'Create New Session';
      case 'viewGroup': return 'Overlapping Sessions';
      case 'smartBooking': return 'Smart Booking';
      case 'viewDetails': 
        switch(modalState.view) {
            case 'cancel': return 'Confirm Cancellation';
            case 'unsavedChanges': return 'Unsaved Changes';
            case 'history': return 'Session History';
            default: return 'Session Details';
        }
      default: return '';
    }
  };
  
  const handleSessionFormChange = (updates: Partial<Session> & { duration?: number }) => {
    setEditedSessionData(prev => {
        if (!prev) return null;
        let updated = { ...prev, ...updates };

        if (modalState.type === 'create') {
            if ('type' in updates) {
                updated.requiresVehicle = updates.type === SessionType.PRACTICE;
                if(updates.type === SessionType.THEORY && !updated.capacity) updated.capacity = 10;
            }

            if ('start' in updates || 'duration' in updates) {
                const startTime = updates.start ? new Date(updates.start) : (updated.start ? new Date(updated.start) : new Date());
                const duration = updates.duration || updated.duration || 60;
                updated.end = new Date(startTime.getTime() + duration * 60000);
            }
        }
        return updated;
    });
  };

  const renderModalContent = (): React.ReactNode => {
    if (modalState.type === 'smartBooking' && currentUser) {
        return (
            <SmartBookingWizard 
                currentUser={currentUser} 
                users={users} 
                onBookSessions={handleSmartBookingConfirm} 
                onClose={closeModal}
            />
        );
    }

    if (modalState.view === 'unsavedChanges') {
        return (
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Unsaved Changes</h3>
                <div className="mt-2 px-7 py-3">
                    <p className="text-sm text-gray-500 dark:text-white">
                        You have unsaved changes. Are you sure you want to discard them and close the modal?
                    </p>
                </div>
            </div>
        );
    }

    if (modalState.type === 'viewGroup') {
        return (
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {modalState.data.map((session: Session) => (
                    <SessionCard key={session.id} session={session} role={currentRole!} onBook={handleBookSession} onCancel={(id) => setModalState({ type: 'viewDetails', view: 'details', data: session})} />
                ))}
            </div>
        )
    }

    if (modalState.view === 'history') {
        const logs = db.getSessionLogs(modalState.data.id);
        return (
            <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                <SessionHistory logs={logs} />
            </div>
        );
    }

    if (!editedSessionData) return null;

    if(modalState.type === 'create') {
        return (
          <div className="space-y-4">
            <label className="block mb-2 font-medium text-gray-700 dark:text-white">Session Type</label>
            <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                    <input type="radio" name="sessionType" value={SessionType.PRACTICE} checked={editedSessionData.type === SessionType.PRACTICE} onChange={() => handleSessionFormChange({ type: SessionType.PRACTICE })} className="form-radio text-primary" />
                    <span className="ml-2 dark:text-white">Practice</span>
                </label>
                <label className="flex items-center cursor-pointer">
                    <input type="radio" name="sessionType" value={SessionType.THEORY} checked={editedSessionData.type === SessionType.THEORY} onChange={() => handleSessionFormChange({ type: SessionType.THEORY })} className="form-radio text-primary" />
                    <span className="ml-2 dark:text-white">Theory</span>
                </label>
            </div>

            <div>
                <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Start Time</label>
                <input 
                    type="datetime-local" 
                    id="start-time" 
                    value={toDateTimeLocal(new Date(editedSessionData.start!))} 
                    onChange={(e) => handleSessionFormChange({ start: new Date(e.target.value) })} 
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"
                />
            </div>

            <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Duration</label>
                <select 
                    id="duration" 
                    value={editedSessionData.duration} 
                    onChange={(e) => handleSessionFormChange({ duration: parseInt(e.target.value, 10) })}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"
                >
                    {DURATION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt} Minutes</option>
                    ))}
                </select>
                {editedSessionData.end && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Ends at: <span className="font-medium">{new Date(editedSessionData.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                )}
            </div>

            {editedSessionData.type === SessionType.THEORY && (
                <div>
                    <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Capacity</label>
                    <input 
                        type="number" 
                        id="capacity" 
                        value={editedSessionData.capacity} 
                        onChange={(e) => handleSessionFormChange({ capacity: parseInt(e.target.value, 10) })} 
                        min="1" 
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"
                    />
                </div>
            )}

            <div className="flex items-center pt-2">
                <input 
                    type="checkbox" 
                    id="requires-vehicle" 
                    checked={!!editedSessionData.requiresVehicle} 
                    onChange={(e) => handleSessionFormChange({ requiresVehicle: e.target.checked })} 
                    disabled={editedSessionData.type === SessionType.THEORY} 
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="requires-vehicle" className="ml-2 block text-sm text-gray-700 dark:text-white">
                    Requires Vehicle
                </label>
            </div>

            {editedSessionData.requiresVehicle && (
                <div className="mt-2">
                    <label htmlFor="vehicle-select" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Assign Vehicle</label>
                    <select 
                        id="vehicle-select" 
                        value={editedSessionData.vehicleId || ''} 
                        onChange={e => handleSessionFormChange({ vehicleId: e.target.value })} 
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"
                    >
                        <option value="">-- Auto-assign later / None --</option>
                        {vehicles.map(v => {
                             const isAvailable = db.isVehicleAvailable(v.id, new Date(editedSessionData.start!), new Date(editedSessionData.end!), editedSessionData.id);
                             const isDisabled = !isAvailable;
                             return (
                                <option key={v.id} value={v.id} disabled={isDisabled}>
                                    {v.name} ({v.plate}) - {v.status} {isDisabled ? '(Busy/Unavailable)' : ''}
                                </option>
                             );
                        })}
                    </select>
                </div>
            )}
          </div>
        );
    }
    
    if (modalState.view === 'cancel') {
        return (
            <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-100 dark:border-red-800">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800 dark:text-white">
                                Confirm Cancellation
                            </h3>
                            <div className="mt-2 text-sm text-red-700 dark:text-white">
                                <p>
                                    Are you sure you want to cancel this session? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <label htmlFor="cancellation-reason" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                        Reason for cancellation (required)
                    </label>
                    <textarea 
                        id="cancellation-reason" 
                        rows={3} 
                        value={cancellationReason} 
                        onChange={(e) => setCancellationReason(e.target.value)} 
                        placeholder="Please explain why you need to cancel..."
                        className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 sm:text-sm"
                    />
                </div>
            </div>
        );
    }

    const isTeacherView = currentRole === Role.TEACHER;
    const session = editedSessionData as Session;
    const vehicleName = session.vehicleId ? vehicles.find(v => v.id === session.vehicleId)?.name : 'N/A';
    const learnerNames = session.learnerNames || []; 
    const isCancelled = session.status === SessionStatus.CANCELLED_BY_TEACHER || session.status === SessionStatus.CANCELLED_BY_LEARNER;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <div><strong className="dark:text-white">Type:</strong> <span className="dark:text-white">{session.type}</span></div>
                    <div><strong className="dark:text-white">Teacher:</strong> <span className="dark:text-white">{session.teacherName}</span></div>
                </div>
                <button 
                    onClick={() => setModalState(prev => ({ ...prev, view: 'history' }))}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    History
                </button>
            </div>
            
            {session.type === SessionType.PRACTICE && learnerNames.length > 0 && <div><strong className="dark:text-white">Learner:</strong> <span className="dark:text-white">{learnerNames[0]}</span></div>}
            {session.type === SessionType.THEORY && <div><strong className="dark:text-white">Attendees:</strong> <span className="dark:text-white">{learnerNames.length} / {session.capacity}</span></div>}
            {session.type === SessionType.THEORY && learnerNames.length > 0 && <div className="text-sm p-2 bg-gray-100 dark:bg-gray-700 rounded max-h-24 overflow-y-auto dark:text-white">{learnerNames.join(', ')}</div>}
            <div><label className="dark:text-white">Start Time</label><input type="datetime-local" value={toDateTimeLocal(new Date(session.start))} disabled={!isTeacherView || isCancelled} onChange={(e) => setEditedSessionData({...editedSessionData, start: new Date(e.target.value)})} className="mt-1 block w-full p-2 border rounded-md disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/></div>
            <div><label className="dark:text-white">End Time</label><input type="datetime-local" value={toDateTimeLocal(new Date(session.end))} disabled={!isTeacherView || isCancelled} onChange={(e) => setEditedSessionData({...editedSessionData, end: new Date(e.target.value)})} className="mt-1 block w-full p-2 border rounded-md disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/></div>
            <div><strong className="dark:text-white">Status:</strong> <span className="dark:text-white">{session.status}</span></div>
            {session.requiresVehicle && <div><strong className="dark:text-white">Vehicle:</strong> <span className="dark:text-white">{vehicleName}</span></div>}
            
            {isTeacherView && session.requiresVehicle && !isCancelled && (
                <div className="mt-2">
                    <label htmlFor="vehicle-select" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Change Vehicle</label>
                    <select 
                        id="vehicle-select" 
                        value={session.vehicleId || ''} 
                        onChange={e => setEditedSessionData({...editedSessionData, vehicleId: e.target.value })} 
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 focus:ring-primary focus:border-primary"
                    >
                        <option value="">-- Auto-assign later / None --</option>
                        {vehicles.map(v => {
                             const isAvailable = db.isVehicleAvailable(v.id, new Date(session.start), new Date(session.end), session.id);
                             const isCurrent = v.id === session.vehicleId;
                             const isDisabled = !isAvailable && !isCurrent;

                             return (
                                <option key={v.id} value={v.id} disabled={isDisabled}>
                                    {v.name} ({v.plate}) - {v.status} {isDisabled ? '(Busy/Unavailable)' : ''}
                                </option>
                             );
                        })}
                    </select>
                </div>
            )}

            {(isCancelled) && (<div className="text-red-500"><strong>Reason:</strong> {session.cancellationReason}</div>)}
        </div>
    );
  };

  const renderModalActions = (): React.ReactNode => {
    if (modalState.type === 'smartBooking') { return null; } 

    if (modalState.view === 'unsavedChanges') {
        return (
            <>
                <button onClick={() => setModalState(prev => ({ ...prev, view: 'details' }))} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500">
                    Keep Editing
                </button>
                <button onClick={confirmClose} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    Discard Changes
                </button>
            </>
        );
    }

    if (modalState.view === 'history') {
        return (
            <button onClick={() => setModalState(prev => ({ ...prev, view: 'details' }))} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-800 dark:text-white">
                Back to Details
            </button>
        );
    }

    if (modalState.type === 'viewGroup') { return <button onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded-md text-gray-900">Close</button> }
    if (!modalState.data) return null;
    const session = modalState.data as Session;
    const isPast = new Date() > session.start;

    if(modalState.type === 'create') { return <><button onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded-md text-gray-900">Cancel</button><button onClick={handleCreateSession} className="px-4 py-2 bg-primary text-primary-contrast rounded-md">Create</button></>; }
    if (modalState.view === 'cancel') { return <><button onClick={() => setModalState(prev => ({...prev, view: 'details'}))} className="px-4 py-2 bg-gray-200 rounded-md text-gray-900">Back</button><button onClick={() => handleCancelSession(session.id, cancellationReason)} className="px-4 py-2 bg-danger text-white rounded-md">Confirm</button></>; }

    const actions: React.ReactNode[] = [];
    const sessionLearnerIds = session.learnerIds || [];

    if (currentRole === Role.LEARNER) {
        const isBooked = sessionLearnerIds.includes(currentUser!.id);
        if (session.type === SessionType.PRACTICE) {
            if (session.status === SessionStatus.AVAILABLE && !isPast) actions.push(<button key="book" onClick={() => handleBookSession(session.id)} className="px-4 py-2 bg-primary text-primary-contrast rounded-md">Book</button>);
            if (session.status === SessionStatus.BOOKED && !isPast && isBooked) actions.push(<button key="cancel" onClick={() => setModalState(prev => ({...prev, view: 'cancel'}))} className="px-4 py-2 bg-danger text-white rounded-md">Cancel Booking</button>);
        } else { // Theory
            if (!isBooked && [SessionStatus.AVAILABLE, SessionStatus.BOOKED].includes(session.status)) actions.push(<button key="join" onClick={() => handleBookSession(session.id)} className="px-4 py-2 bg-primary text-primary-contrast rounded-md">Join Session</button>);
            if (isBooked && ![SessionStatus.FINISHED, SessionStatus.CANCELLED_BY_TEACHER].includes(session.status)) actions.push(<button key="leave" onClick={() => handleCancelSession(session.id, 'Leaving session')} className="px-4 py-2 bg-danger text-white rounded-md">Leave Session</button>);
        }
    } else if (currentRole === Role.TEACHER) {
        if (session.status === SessionStatus.AVAILABLE && !isPast) actions.push(<button key="delete" onClick={() => handleDeleteSession(session.id)} className="px-4 py-2 bg-danger text-white rounded-md">Delete</button>);
        if (session.status === SessionStatus.IN_PROGRESS) actions.push(<button key="mark-done" onClick={() => handleMarkDone(session.id)} className="px-4 py-2 bg-success text-white rounded-md">Mark Finished</button>);
        if (![SessionStatus.FINISHED, SessionStatus.CANCELLED_BY_LEARNER, SessionStatus.CANCELLED_UNBOOKED, SessionStatus.CANCELLED_BY_TEACHER].includes(session.status)) {
            actions.push(<button key="cancel" onClick={() => setModalState(prev => ({...prev, view: 'cancel'}))} className="px-4 py-2 bg-danger text-white rounded-md">Cancel Session</button>);
            actions.push(<button key="save" onClick={handleUpdateSession} disabled={!isDirty} className="px-4 py-2 bg-primary text-primary-contrast rounded-md disabled:bg-gray-400 disabled:text-gray-800">Save</button>);
        }
    }

    return <><button onClick={closeModal} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md mr-auto text-gray-800 dark:text-white">Close</button>{actions}</>;
  };
  
  const userNotifications = useMemo(() => currentUser ? notifications.filter(n => n.userId === currentUser.id) : [], [notifications, currentUser]);

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to={currentRole === Role.ADMIN ? '/admin' : '/schedule'} replace />
            ) : (
              <div className="min-h-screen flex items-center justify-center p-4">
                <Auth onLogin={handleLogin} onRegister={handleRegister} />
              </div>
            )
          }
        />
        <Route
          path="/*"
          element={
            currentUser ? (
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                <Header onLogout={handleLogout} currentUser={currentUser} notifications={userNotifications} onMarkNotificationsRead={handleMarkNotificationsRead} onToggleSettings={() => setIsSettingsOpen(prev => !prev)} />
                <main className="container mx-auto">
                  <Routes>
                    <Route 
                      path="/schedule" 
                      element={
                        [Role.LEARNER, Role.TEACHER].includes(currentRole) ? (
                            <div className="p-4 sm:p-6 md:p-8">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{currentRole}'s Schedule</h2>
                                    {currentRole === Role.LEARNER && (
                                        <button 
                                            onClick={() => setModalState({ type: 'smartBooking', view: 'details', data: null })}
                                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md shadow-sm transition flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Smart Book
                                        </button>
                                    )}
                                </div>
                                <ScheduleCalendar 
                                  sessions={sessions} role={currentRole} currentUser={currentUser} users={users}
                                  onUpdateSession={handleUpdateSessionTime}
                                  onInitiateCreate={(start, end) => {
                                      const roundedStart = new Date(Math.ceil(start.getTime() / (15 * 60000)) * (15 * 60000));
                                      const defaultDuration = 60;
                                      const calculatedEnd = new Date(roundedStart.getTime() + defaultDuration * 60000);
                                      
                                      setModalState({ 
                                          type: 'create', 
                                          view: 'details', 
                                          data: { 
                                              start: roundedStart, 
                                              end: calculatedEnd, 
                                              requiresVehicle: true, 
                                              type: SessionType.PRACTICE, 
                                              duration: defaultDuration,
                                              capacity: 10
                                          }
                                      })
                                  }}
                                  onEventClick={(data) => {
                                      if (Array.isArray(data)) {
                                        setModalState({ type: 'viewGroup', view: 'details', data: data })
                                      } else {
                                        setModalState({ type: 'viewDetails', view: 'details', data: data })
                                      }
                                  }}
                                />
                            </div>
                        ) : (
                          <Navigate to={currentRole === Role.ADMIN ? '/admin' : '/login'} replace />
                        )
                      } 
                    />
                    <Route 
                      path="/admin" 
                      element={
                        currentRole === Role.ADMIN ? (
                          <AdminDashboard sessions={sessions} users={users} vehicles={vehicles} onRefresh={refreshData} />
                        ) : (
                          <Navigate to={currentRole === Role.LEARNER || currentRole === Role.TEACHER ? '/schedule' : '/login'} replace />
                        )
                      }
                    />
                    <Route path="/" element={<Navigate to={currentRole === Role.ADMIN ? '/admin' : '/schedule'} replace />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
                <SettingsSidebar isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={currentUser} theme={theme} onThemeChange={setTheme} onUpdateUser={handleUpdateUser} />
                <Modal isOpen={modalState.type !== null} onClose={closeModal} title={getModalTitle()} actions={renderModalActions()}>
                  {renderModalContent()}
                </Modal>
              </div>
            ) : (
              <Navigate to="/login" state={{ from: location }} replace />
            )
          }
        />
      </Routes>
    </>
  );
};

const deepEqual = (objA: any, objB: any): boolean => {
    if (objA === objB) return true;
    if (objA && objB && typeof objA === 'object' && typeof objB === 'object') {
        if (objA.constructor !== objB.constructor) return false;
        let length = Object.keys(objA).length;
        if (length !== Object.keys(objB).length) return false;
        for (let key in objA) {
            if (Object.prototype.hasOwnProperty.call(objA, key)) {
                if (!Object.prototype.hasOwnProperty.call(objB, key) || !deepEqual(objA[key], objB[key])) {
                    if ( (objA[key] instanceof Date && objB[key] instanceof Date) && (objA[key].getTime() === objB[key].getTime()) ) continue;
                    return false;
                }
            }
        }
        return true;
    }
    return false;
};

export default App;
