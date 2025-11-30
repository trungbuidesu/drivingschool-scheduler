
import React from 'react';
import { SessionLog, SessionAction } from '../types';

interface SessionHistoryProps {
  logs: SessionLog[];
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ logs }) => {
  const getIcon = (action: SessionAction) => {
    switch(action) {
        case 'CREATE': return <span className="bg-green-100 text-green-600 p-1 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></span>;
        case 'BOOK': return <span className="bg-blue-100 text-blue-600 p-1 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></span>;
        case 'CANCEL': return <span className="bg-red-100 text-red-600 p-1 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></span>;
        case 'RESCHEDULE': return <span className="bg-yellow-100 text-yellow-600 p-1 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>;
        case 'VEHICLE_CHANGE': return <span className="bg-purple-100 text-purple-600 p-1 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></span>;
        case 'FINISH': return <span className="bg-gray-100 text-gray-600 p-1 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></span>;
        default: return <span className="bg-gray-100 text-gray-500 p-1 rounded-full">●</span>;
    }
  };

  if (logs.length === 0) {
      return <div className="text-center text-gray-500 italic py-4 dark:text-gray-400">No history recorded for this session.</div>;
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {logs.map((log, idx) => (
          <li key={log.id}>
            <div className="relative pb-8">
              {idx !== logs.length - 1 ? (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
              ) : null}
              <div className="relative flex space-x-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 bg-white dark:bg-gray-800">
                  {getIcon(log.action)}
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      {log.details}
                    </p>
                    {log.metadata && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                            {log.metadata.reason && <p><strong>Reason:</strong> {log.metadata.reason}</p>}
                            {log.metadata.oldStart && <p><strong>Previous Time:</strong> {new Date(log.metadata.oldStart).toLocaleString()}</p>}
                            {log.metadata.oldVehicle && <p><strong>Previous Vehicle:</strong> {log.metadata.oldVehicle}</p>}
                        </div>
                    )}
                  </div>
                  <div className="text-right text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
                    <time dateTime={log.timestamp.toISOString()}>{log.timestamp.toLocaleString()}</time>
                    <p className="font-medium">{log.actorName}</p>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
