
import { Role, Session, SessionStatus, SessionType, User, Vehicle } from './types';

const DEFAULT_THEME = { primary: '#007BFF', secondary: '#6C757D' };
const NOW = new Date();

// Helper to generate a random date within the last X days
const randomPastDate = (days: number) => {
    return new Date(NOW.getTime() - Math.floor(Math.random() * days) * 24 * 60 * 60 * 1000);
};

export const USERS: User[] = [
  { id: 'admin-1', name: 'Admin User', email: 'admin@drivetime.com', password: 'password', role: Role.ADMIN, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', themeColors: DEFAULT_THEME, firstDayOfWeek: 0, isActive: true, registeredAt: randomPastDate(90) },
  
  { id: 'teacher-1', name: 'John Instructor', email: 'john@drivetime.com', password: 'password', role: Role.TEACHER, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', themeColors: DEFAULT_THEME, firstDayOfWeek: 0, isActive: true, registeredAt: randomPastDate(90) },
  { id: 'teacher-2', name: 'Sarah Teacher', email: 'sarah@drivetime.com', password: 'password', role: Role.TEACHER, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', themeColors: DEFAULT_THEME, firstDayOfWeek: 0, isActive: true, registeredAt: randomPastDate(60) },
  { id: 'teacher-3', name: 'Mike Coach', email: 'mike@drivetime.com', password: 'password', role: Role.TEACHER, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', themeColors: DEFAULT_THEME, firstDayOfWeek: 0, isActive: true, registeredAt: randomPastDate(30) },

  { id: 'learner-1', name: 'Alex Learner', email: 'alex@drivetime.com', password: 'password', role: Role.LEARNER, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', themeColors: DEFAULT_THEME, firstDayOfWeek: 0, isActive: true, registeredAt: randomPastDate(90) },
  { id: 'learner-2', name: 'Beta Student', email: 'beta@drivetime.com', password: 'password', role: Role.LEARNER, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Beta', themeColors: DEFAULT_THEME, firstDayOfWeek: 0, isActive: true, registeredAt: randomPastDate(45) },
];

// Generate 20 additional learners with varying registration dates to simulate growth
const LEARNER_NAMES = ['Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor'];
LEARNER_NAMES.forEach((name, idx) => {
    // Spread registration over last 12 weeks (approx 90 days)
    // We weight it so more users registered recently
    const daysAgo = Math.floor(Math.random() * 90); 
    USERS.push({
        id: `learner-gen-${idx}`,
        name: `${name} Student`,
        email: `${name.toLowerCase()}@drivetime.com`,
        password: 'password',
        role: Role.LEARNER,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        themeColors: DEFAULT_THEME,
        firstDayOfWeek: 0,
        isActive: true,
        registeredAt: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    });
});

export const VEHICLES: Vehicle[] = [
  { id: 'v-1', name: 'Toyota Corolla', plate: 'ABC-123', status: 'Active' },
  { id: 'v-2', name: 'Honda Civic', plate: 'XYZ-789', status: 'Active' },
  { id: 'v-3', name: 'Ford Focus', plate: 'LMN-456', status: 'Maintenance' },
  { id: 'v-4', name: 'Tesla Model 3', plate: 'ELN-007', status: 'Active' },
  // Additional Vehicles
  { id: 'v-5', name: 'Hyundai Elantra', plate: 'HYU-101', status: 'Active' },
  { id: 'v-6', name: 'Mazda 3', plate: 'MZD-202', status: 'Active' },
  { id: 'v-7', name: 'Volkswagen Golf', plate: 'VW-303', status: 'Active' },
  { id: 'v-8', name: 'Kia Forte', plate: 'KIA-404', status: 'Retired' },
  { id: 'v-9', name: 'Nissan Sentra', plate: 'NIS-505', status: 'Maintenance' },
];

export const generateInitialSessions = (): Session[] => {
  const sessions: Session[] = [];
  const now = new Date();
  
  // Helper to manipulate dates
  const addDays = (date: Date, d: number) => new Date(date.getTime() + d * 24 * 60 * 60 * 1000);
  const setTime = (date: Date, h: number, m: number) => {
      const newDate = new Date(date);
      newDate.setHours(h, m, 0, 0);
      return newDate;
  }

  const teachers = USERS.filter(u => u.role === Role.TEACHER);
  const learners = USERS.filter(u => u.role === Role.LEARNER);
  const activeVehicles = VEHICLES.filter(v => v.status === 'Active');

  // Generate sessions for range: -14 days (history) to +60 days (future)
  for (let dayOffset = -14; dayOffset <= 60; dayOffset++) {
      const currentDate = addDays(now, dayOffset);
      // Skip weekends randomly (20% chance of session on weekend)
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      if (isWeekend && Math.random() > 0.2) continue;

      teachers.forEach((teacher, tIndex) => {
          // Define daily slots for this teacher
          // Stagger slots so teachers don't always overlap perfectly
          const slots = [
              { h: 9, m: 0 },
              { h: 11, m: 0 },
              { h: 14, m: 0 },
              { h: 16, m: 0 }
          ];

          slots.forEach((slot, sIndex) => {
              // 70% chance a teacher has a slot at this time
              if (Math.random() > 0.3) {
                  const start = setTime(currentDate, slot.h, slot.m);
                  const end = new Date(start.getTime() + 60 * 60000); // 1 hour
                  const isPast = start < now;
                  
                  const sessionType = (Math.random() > 0.85) ? SessionType.THEORY : SessionType.PRACTICE;
                  let status = SessionStatus.AVAILABLE;
                  let learnerIds: string[] = [];
                  let learnerNames: string[] = [];
                  let vehicleId: string | null = null;
                  let requiresVehicle = false;
                  let capacity = undefined;

                  if (sessionType === SessionType.PRACTICE) {
                      requiresVehicle = true;
                      // Assign a vehicle round-robin based on slot index + teacher index
                      vehicleId = activeVehicles[(sIndex + tIndex) % activeVehicles.length].id;

                      if (isPast) {
                          status = (Math.random() > 0.1) ? SessionStatus.FINISHED : SessionStatus.CANCELLED_BY_LEARNER;
                          // Past sessions usually had a learner
                          if (status === SessionStatus.FINISHED) {
                              const l = learners[Math.floor(Math.random() * learners.length)];
                              learnerIds = [l.id];
                              learnerNames = [l.name];
                          }
                      } else {
                          // Future
                          const rand = Math.random();
                          if (rand > 0.7) {
                              // 30% booked
                              status = SessionStatus.BOOKED;
                              const l = learners[Math.floor(Math.random() * learners.length)];
                              learnerIds = [l.id];
                              learnerNames = [l.name];
                          } else {
                              status = SessionStatus.AVAILABLE;
                          }
                      }
                  } else {
                      // Theory
                      requiresVehicle = false;
                      capacity = 10;
                      
                      if (isPast) {
                          status = SessionStatus.FINISHED;
                          // Random attendees
                          const count = Math.floor(Math.random() * 5);
                          for(let k=0; k<count; k++) {
                              const l = learners[k % learners.length];
                              if(!learnerIds.includes(l.id)) {
                                  learnerIds.push(l.id);
                                  learnerNames.push(l.name);
                              }
                          }
                      } else {
                           // Future Theory
                           if (Math.random() > 0.5) {
                               status = SessionStatus.BOOKED;
                               // Add 1 learner
                               const l = learners[Math.floor(Math.random() * learners.length)];
                               learnerIds = [l.id];
                               learnerNames = [l.name];
                           } else {
                               status = SessionStatus.AVAILABLE;
                           }
                      }
                  }

                  sessions.push({
                      id: `sess-${start.getTime()}-${teacher.id}`,
                      teacherId: teacher.id,
                      teacherName: teacher.name,
                      learnerIds,
                      learnerNames,
                      start,
                      end,
                      status,
                      createdAt: new Date(now.getTime() - 10000000), // created a while ago
                      cancellationReason: status.includes('Cancelled') ? 'Personal reasons' : null,
                      requiresVehicle,
                      vehicleId,
                      type: sessionType,
                      capacity,
                      duration: 60
                  });
              }
          });
      });
  }

  return sessions;
};
