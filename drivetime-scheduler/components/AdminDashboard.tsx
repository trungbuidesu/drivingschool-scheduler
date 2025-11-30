
import React, { useState, useMemo } from 'react';
import { Session, SessionStatus, User, Role, Vehicle, SessionType, ForecastData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { Modal } from './Modal';
import { toast } from 'react-hot-toast';
import { db } from '../services/DatabaseService';

interface AdminDashboardProps {
  sessions: Session[];
  users: User[];
  vehicles: Vehicle[];
  onRefresh: () => void;
}

// Helper to get week number for grouping data
const getWeek = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ sessions, users, vehicles, onRefresh }) => {
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  
  // Modal States
  const [activeModal, setActiveModal] = useState<'addUser' | 'addVehicle' | null>(null);
  
  // Form Data
  const [newUser, setNewUser] = useState({ name: '', email: '', role: Role.LEARNER, password: 'password123' });
  const [newVehicle, setNewVehicle] = useState({ name: '', plate: '' });

  const learners = useMemo(() => users.filter(u => u.role === Role.LEARNER), [users]);
  const teachers = useMemo(() => users.filter(u => u.role === Role.TEACHER), [users]);

  const stats = useMemo(() => {
    const totalBookings = sessions.reduce((acc, s) => {
        return acc + (s.type === SessionType.PRACTICE && s.learnerIds.length > 0 ? 1 : s.learnerIds.length);
    }, 0);
    const totalCancellations = sessions.filter(s => s.status === SessionStatus.CANCELLED_BY_LEARNER).length;
    const finishedSessions = sessions.filter(s => s.status === SessionStatus.FINISHED).length;
    const upcomingSessions = sessions.filter(s => s.start > new Date() && (s.status === SessionStatus.BOOKED || s.status === SessionStatus.AVAILABLE || s.status === SessionStatus.FULL)).length;
    return { totalBookings, totalCancellations, finishedSessions, upcomingSessions };
  }, [sessions]);

  const weeklyHistory = useMemo(() => {
    const data: { [week: string]: ForecastData } = {};
    
    // Aggregate Sessions
    sessions.forEach(session => {
        const year = session.createdAt.getFullYear();
        const week = getWeek(session.createdAt);
        const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
        
        if (!data[weekKey]) {
            data[weekKey] = { week: weekKey, bookings: 0, cancellations: 0, registrations: 0 };
        }

        const bookingCount = session.type === SessionType.PRACTICE && session.learnerIds.length > 0 ? 1 : session.learnerIds.length;
        if(bookingCount > 0) {
            data[weekKey].bookings = (data[weekKey].bookings || 0) + bookingCount;
        }

        if (session.status === SessionStatus.CANCELLED_BY_LEARNER) {
            data[weekKey].cancellations = (data[weekKey].cancellations || 0) + 1;
        }
    });

    // Aggregate User Registrations
    users.forEach(user => {
        if (user.role === Role.LEARNER && user.registeredAt) {
            const year = user.registeredAt.getFullYear();
            const week = getWeek(user.registeredAt);
            const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
            
            if (!data[weekKey]) {
                 data[weekKey] = { week: weekKey, bookings: 0, cancellations: 0, registrations: 0 };
            }
            data[weekKey].registrations = (data[weekKey].registrations || 0) + 1;
        }
    });

    return Object.values(data).sort((a, b) => a.week.localeCompare(b.week));
  }, [sessions, users]);

  // Merge history and forecast for the chart
  const chartData = useMemo(() => {
      const historyWithNullPrediction = weeklyHistory.map(h => ({ 
          ...h, 
          predictedBookings: undefined,
          predictedRegistrations: undefined 
      }));
      return [...historyWithNullPrediction, ...forecastData];
  }, [weeklyHistory, forecastData]);


  const handleAnalyze = () => {
    setLoadingAnalysis(true);
    setAnalysisHtml('');
    setForecastData([]);
    
    setTimeout(() => {
        const result = db.getOfflineForecast();
        setAnalysisHtml(result.analysisHtml);
        setForecastData(result.forecast);
        setLoadingAnalysis(false);
    }, 800);
  };

  // --- User Management ---
  const handleAddUser = () => {
      try {
          db.adminCreateUser(newUser);
          toast.success(`${newUser.role} added successfully!`);
          setActiveModal(null);
          setNewUser({ name: '', email: '', role: Role.LEARNER, password: 'password123' });
          onRefresh();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
      try {
          db.adminToggleUserStatus(userId, !currentStatus);
          toast.success("User status updated.");
          onRefresh();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  const handleDeleteUser = (userId: string) => {
      if (!window.confirm("Are you sure? This will delete the user and remove them from all history.")) return;
      try {
          db.adminDeleteUser(userId);
          toast.success("User deleted.");
          onRefresh();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  // --- Vehicle Management ---
  const handleAddVehicle = () => {
      try {
          db.adminCreateVehicle(newVehicle);
          toast.success("Vehicle added successfully!");
          setActiveModal(null);
          setNewVehicle({ name: '', plate: '' });
          onRefresh();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  const handleChangeVehicleStatus = (vehicleId: string, status: Vehicle['status']) => {
      try {
          db.adminUpdateVehicleStatus(vehicleId, status);
          toast.success("Vehicle status updated.");
          onRefresh();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  const handleDeleteVehicle = (vehicleId: string) => {
      if (!window.confirm("Are you sure?")) return;
      try {
          db.adminDeleteVehicle(vehicleId);
          toast.success("Vehicle deleted.");
          onRefresh();
      } catch (e: any) {
          toast.error(e.message);
      }
  };


  const renderUserTable = (data: User[]) => (
    <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Joined</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                {data.map((user) => (
                    <tr key={user.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                        <td className="px-4 py-2 font-medium">{user.name}</td>
                        <td className="px-4 py-2">{user.email}</td>
                        <td className="px-4 py-2">{user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td className="px-4 py-2 text-right space-x-2">
                            <button onClick={() => handleToggleUserStatus(user.id, user.isActive)} className="text-blue-600 hover:underline text-xs">
                                {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:underline text-xs">
                                Delete
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  const renderVehicleTable = (data: Vehicle[]) => (
    <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Plate</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                {data.map((v) => (
                    <tr key={v.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                        <td className="px-4 py-2 font-medium">{v.name}</td>
                        <td className="px-4 py-2">{v.plate}</td>
                        <td className="px-4 py-2">
                            <select 
                                value={v.status} 
                                onChange={(e) => handleChangeVehicleStatus(v.id, e.target.value as Vehicle['status'])}
                                className="text-xs p-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                            >
                                <option value="Active">Active</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Retired">Retired</option>
                            </select>
                        </td>
                        <td className="px-4 py-2 text-right">
                            <button onClick={() => handleDeleteVehicle(v.id)} className="text-red-600 hover:underline text-xs">
                                Delete
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Total Bookings</h3>
          <p className="text-4xl font-bold text-primary dark:text-blue-400 mt-2">{stats.totalBookings}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Finished Sessions</h3>
          <p className="text-4xl font-bold text-success dark:text-green-400 mt-2">{stats.finishedSessions}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Upcoming Sessions</h3>
          <p className="text-4xl font-bold text-info dark:text-cyan-400 mt-2">{stats.upcomingSessions}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Cancellations</h3>
          <p className="text-4xl font-bold text-danger dark:text-red-400 mt-2">{stats.totalCancellations}</p>
        </div>
      </div>

      {/* Trend Analysis & Forecast (Offline) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h3 className="text-xl font-bold text-gray-700 dark:text-white">Trends & Forecasting</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Historical data analysis for bookings and registrations.</p>
            </div>
            <button
                onClick={handleAnalyze}
                disabled={loadingAnalysis}
                className="bg-purple-600 text-white py-2 px-6 rounded-md hover:bg-purple-700 transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
                {loadingAnalysis ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Forecast...
                </>
                ) : (
                    <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        Generate Forecast
                    </>
                )}
            </button>
        </div>

        {/* Combined Chart */}
        <div className="mb-8 h-96">
            <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700"/>
                <XAxis dataKey="week" className="text-xs text-gray-600 dark:text-gray-400" />
                <YAxis className="text-xs text-gray-600 dark:text-gray-400"/>
                <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', color: '#333' }}
                    formatter={(value, name) => {
                        if (name === 'predictedBookings') return [value, 'Forecast (Bookings)'];
                        if (name === 'predictedRegistrations') return [value, 'Forecast (Users)'];
                        if (name === 'registrations') return [value, 'New Registrations'];
                        if (name === 'bookings') return [value, 'Actual Bookings'];
                        return [value, name];
                    }}
                />
                <Legend />
                <Bar dataKey="bookings" fill="#007BFF" name="Bookings" barSize={20} />
                <Line type="monotone" dataKey="predictedBookings" stroke="#007BFF" strokeDasharray="5 5" strokeWidth={2} name="Forecast (Bookings)" dot={false} />
                
                <Bar dataKey="registrations" fill="#28A745" name="Registrations" barSize={20} />
                <Line type="monotone" dataKey="predictedRegistrations" stroke="#28A745" strokeDasharray="5 5" strokeWidth={2} name="Forecast (Registrations)" dot={false} />
            </ComposedChart>
            </ResponsiveContainer>
        </div>

        {/* Analysis Text */}
        {analysisHtml && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Insights</h4>
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: analysisHtml }} />
            </div>
        )}
      </div>
      
      {/* Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teachers Management */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md lg:col-span-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-700 dark:text-white">Teachers</h3>
                <button onClick={() => { setNewUser(p => ({...p, role: Role.TEACHER})); setActiveModal('addUser'); }} className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                    + Add
                </button>
            </div>
            <div className="flex-grow overflow-y-auto max-h-96 custom-scrollbar">
                {renderUserTable(teachers)}
            </div>
        </div>

        {/* Learners Management */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md lg:col-span-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-700 dark:text-white">Learners</h3>
                <button onClick={() => { setNewUser(p => ({...p, role: Role.LEARNER})); setActiveModal('addUser'); }} className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                    + Add
                </button>
            </div>
            <div className="flex-grow overflow-y-auto max-h-96 custom-scrollbar">
                {renderUserTable(learners)}
            </div>
        </div>

        {/* Vehicles Management */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md lg:col-span-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-700 dark:text-white">Vehicles</h3>
                <button onClick={() => setActiveModal('addVehicle')} className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                    + Add
                </button>
            </div>
            <div className="flex-grow overflow-y-auto max-h-96 custom-scrollbar">
                {renderVehicleTable(vehicles)}
            </div>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal 
        isOpen={activeModal === 'addUser'} 
        onClose={() => setActiveModal(null)} 
        title={`Add New ${newUser.role === Role.TEACHER ? 'Teacher' : 'Learner'}`}
        actions={
            <>
                <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-800 dark:text-white">Cancel</button>
                <button onClick={handleAddUser} className="px-4 py-2 bg-primary text-white rounded-md">Create User</button>
            </>
        }
      >
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Name</label>
                  <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="mt-1 block w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Email</label>
                  <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="mt-1 block w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Default Password</label>
                  <input type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="mt-1 block w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
          </div>
      </Modal>

      {/* Add Vehicle Modal */}
      <Modal 
        isOpen={activeModal === 'addVehicle'} 
        onClose={() => setActiveModal(null)} 
        title="Add New Vehicle"
        actions={
            <>
                <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-800 dark:text-white">Cancel</button>
                <button onClick={handleAddVehicle} className="px-4 py-2 bg-primary text-white rounded-md">Create Vehicle</button>
            </>
        }
      >
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">Vehicle Name/Model</label>
                  <input type="text" value={newVehicle.name} onChange={e => setNewVehicle({...newVehicle, name: e.target.value})} placeholder="e.g. Toyota Prius" className="mt-1 block w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">License Plate</label>
                  <input type="text" value={newVehicle.plate} onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})} placeholder="ABC-123" className="mt-1 block w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
          </div>
      </Modal>
    </div>
  );
};
