
export enum Role {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  LEARNER = 'LEARNER',
  ANONYMOUS = 'ANONYMOUS'
}

export interface ThemeColors {
  primary: string;
  secondary: string;
}

export interface TeacherConstraints {
  maxSessionsPerLearnerDaily?: number;
  maxSessionsPerLearnerWeekly?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for security in UI, present in mock
  role: Role;
  avatarUrl?: string;
  themeColors?: ThemeColors;
  firstDayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc.
  teacherConstraints?: TeacherConstraints;
  isActive: boolean;
  registeredAt: Date;
}

export enum SessionStatus {
  AVAILABLE = 'Available',
  BOOKED = 'Booked',
  FULL = 'Full',
  IN_PROGRESS = 'In Progress',
  FINISHED = 'Finished',
  CANCELLED_BY_LEARNER = 'Cancelled (Learner)',
  CANCELLED_BY_TEACHER = 'Cancelled (Teacher)',
  CANCELLED_UNBOOKED = 'Cancelled (Unbooked)'
}

export enum SessionType {
  PRACTICE = 'Practice',
  THEORY = 'Theory'
}

export interface Session {
  id: string;
  teacherId: string;
  teacherName: string;
  learnerIds: string[];
  learnerNames: string[];
  start: Date;
  end: Date;
  status: SessionStatus;
  createdAt: Date;
  cancellationReason: string | null;
  requiresVehicle: boolean;
  vehicleId: string | null;
  type: SessionType;
  capacity?: number;
  duration?: number; // Helper for forms
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  status: 'Active' | 'Maintenance' | 'Retired';
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  timestamp: Date;
}

// Smart Booking Types
export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Any';

export interface SmartBookingPreferences {
  sessionCount: number;
  preferredTime: TimeOfDay;
  preferredTeacherId: string;
  preferredDays: number[]; // 0-6 (Sun-Sat)
}

export interface ScoredSession extends Session {
  score: number;
  matchReasons: string[];
}

// Audit Logs
export type SessionAction = 'CREATE' | 'BOOK' | 'CANCEL' | 'RESCHEDULE' | 'VEHICLE_CHANGE' | 'STATUS_CHANGE' | 'FINISH';

export interface SessionLog {
  id: string;
  sessionId: string;
  action: SessionAction;
  timestamp: Date;
  actorName: string;
  details: string; // Human readable summary
  metadata?: {
    oldStart?: Date;
    newStart?: Date;
    oldVehicle?: string;
    newVehicle?: string;
    reason?: string;
  };
}

// AI Forecast Types
export interface ForecastPoint {
  week: string;
  predictedBookings: number;
}

export interface GeminiAnalysisResult {
  analysisHtml: string;
  forecast: ForecastData[];
}

export interface ForecastData {
    week: string;
    bookings?: number;
    predictedBookings?: number;
    cancellations?: number;
    registrations?: number;
    predictedRegistrations?: number;
}
