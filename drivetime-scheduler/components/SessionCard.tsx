
import React from 'react';
import { Session, SessionStatus, Role, SessionType } from '../types';

interface SessionCardProps {
  session: Session;
  role: Role;
  onBook?: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
  onMarkDone?: (sessionId: string) => void;
}

const getStatusColorClasses = (status: SessionStatus): string => {
  switch (status) {
    case SessionStatus.AVAILABLE:
      return 'bg-green-100 text-green-800 border-green-400 dark:bg-green-900 dark:text-green-300 dark:border-green-600';
    case SessionStatus.BOOKED:
      return 'bg-blue-100 text-blue-800 border-blue-400 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-600';
    case SessionStatus.FULL:
        return 'bg-purple-100 text-purple-800 border-purple-400 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-600';
    case SessionStatus.IN_PROGRESS:
      return 'bg-yellow-100 text-yellow-800 border-yellow-400 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-600 animate-pulse';
    case SessionStatus.FINISHED:
      return 'bg-gray-200 text-gray-800 border-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500';
    case SessionStatus.CANCELLED_BY_LEARNER:
    case SessionStatus.CANCELLED_BY_TEACHER:
    case SessionStatus.CANCELLED_UNBOOKED:
      return 'bg-red-100 text-red-800 border-red-400 dark:bg-red-900 dark:text-red-300 dark:border-red-600';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
  }
};

export const SessionCard: React.FC<SessionCardProps> = ({ session, role, onBook, onCancel, onDelete, onMarkDone }) => {
  const { id, start, end, status, teacherName, learnerNames, type, capacity, learnerIds } = session;

  const renderActions = () => {
    switch (role) {
      case Role.LEARNER:
        if (type === SessionType.PRACTICE) {
          if (status === SessionStatus.AVAILABLE && onBook) {
            return <button onClick={() => onBook(id)} className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300">Book Now</button>;
          }
          if (status === SessionStatus.BOOKED && onCancel) {
            return <button onClick={() => onCancel(id)} className="w-full bg-danger text-white py-2 px-4 rounded-md hover:bg-red-700 transition duration-300">Cancel Booking</button>;
          }
        } else { // Theory
          const isBooked = learnerIds?.includes('user-learner'); // Placeholder for current user id
          if (!isBooked && [SessionStatus.AVAILABLE, SessionStatus.BOOKED].includes(status) && onBook) {
            return <button onClick={() => onBook(id)} className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300">Join Session</button>;
          }
          if (isBooked && [SessionStatus.BOOKED, SessionStatus.FULL, SessionStatus.IN_PROGRESS].includes(status) && onCancel) {
            return <button onClick={() => onCancel(id)} className="w-full bg-danger text-white py-2 px-4 rounded-md hover:bg-red-700 transition duration-300">Leave Session</button>;
          }
        }
        return null;
      case Role.TEACHER:
        if (status === SessionStatus.IN_PROGRESS && onMarkDone) {
          return <button onClick={() => onMarkDone(id)} className="w-full bg-success text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-300">Mark as Finished</button>;
        }
        if ([SessionStatus.AVAILABLE, SessionStatus.BOOKED, SessionStatus.FULL].includes(status) && onDelete) {
            return <button onClick={() => onDelete(id)} className="w-full bg-danger text-white py-2 px-4 rounded-md hover:bg-red-700 transition duration-300">Delete Session</button>;
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 shadow-sm transition-transform hover:scale-105 ${getStatusColorClasses(status)}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-lg">{start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <p className="text-sm">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-sm font-semibold mt-1">{type}</p>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColorClasses(status).replace('border-l-4', '')}`}>{status}</span>
      </div>
      <div className="mt-4 border-t border-gray-300 dark:border-gray-600 pt-2">
        <p className="text-sm"><strong>Teacher:</strong> {teacherName}</p>
        {type === SessionType.PRACTICE && (learnerNames?.length || 0) > 0 && <p className="text-sm"><strong>Learner:</strong> {learnerNames[0]}</p>}
        {type === SessionType.THEORY && <p className="text-sm"><strong>Attendees:</strong> {learnerNames?.length || 0} / {capacity}</p>}
      </div>
      <div className="mt-4">
        {renderActions()}
      </div>
    </div>
  );
};
