
import { User, Session, Vehicle, Notification, Role, SessionStatus, SessionType, SmartBookingPreferences, ScoredSession, SessionLog, SessionAction, GeminiAnalysisResult, ForecastData } from '../types';
import { USERS, VEHICLES, generateInitialSessions } from '../sample_data';

class DatabaseService {
  private users: User[];
  private sessions: Session[];
  private vehicles: Vehicle[];
  private notifications: Notification[];
  private logs: SessionLog[];

  constructor() {
    // Initialize with sample data
    this.users = [...USERS];
    this.vehicles = [...VEHICLES];
    this.sessions = generateInitialSessions();
    this.notifications = [];
    this.logs = [];
  }

  // --- Helpers ---
  private addLog(sessionId: string, action: SessionAction, actor: User | 'SYSTEM', details: string, metadata?: any) {
    const log: SessionLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      sessionId,
      action,
      timestamp: new Date(),
      actorName: actor === 'SYSTEM' ? 'System' : actor.name,
      details,
      metadata
    };
    this.logs.unshift(log);
  }

  public getSessionLogs(sessionId: string): SessionLog[] {
    return this.logs.filter(l => l.sessionId === sessionId).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // --- Users ---
  public authenticate(email: string, password: string): User | undefined {
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) return undefined;

    // Password check
    if (user.password === password) {
        // Check if account is active
        if (!user.isActive) {
            // Find admin email for the message (optional, or hardcode)
            const admin = this.users.find(u => u.role === Role.ADMIN);
            const adminEmail = admin ? admin.email : 'admin@drivetime.com';
            throw new Error(`Your account has been disabled. Please contact admin at ${adminEmail}.`);
        }
        return user;
    }

    return undefined;
  }

  public registerUser(name: string, email: string, password: string): User {
    if (this.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists.");
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      password,
      role: Role.LEARNER,
      avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}`,
      themeColors: { primary: '#007BFF', secondary: '#6C757D' },
      firstDayOfWeek: 0,
      isActive: true,
      registeredAt: new Date()
    };
    this.users.push(newUser);
    this.createNotification(newUser.id, 'Welcome! You have successfully registered.');
    return newUser;
  }

  public updateUser(userId: string, updates: Partial<User>): User {
    const index = this.users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error("User not found");

    // Email Uniqueness Check
    if (updates.email) {
        const emailExists = this.users.some(u => u.email.toLowerCase() === updates.email!.toLowerCase() && u.id !== userId);
        if (emailExists) throw new Error("This email address is already in use by another account.");
    }

    // Merge updates (handle nested teacherConstraints)
    const currentUser = this.users[index];
    const updatedUser = { 
        ...currentUser, 
        ...updates,
        teacherConstraints: {
            ...currentUser.teacherConstraints,
            ...updates.teacherConstraints
        }
    };
    
    this.users[index] = updatedUser;
    return updatedUser;
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  // --- Admin User Management ---
  public adminCreateUser(userData: { name: string; email: string; role: Role; password?: string }): User {
    if (this.users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
        throw new Error("Email already exists.");
    }
    const newUser: User = {
        id: `user-${Date.now()}`,
        name: userData.name,
        email: userData.email,
        password: userData.password || 'password123', // Default password
        role: userData.role,
        avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}`,
        themeColors: { primary: '#007BFF', secondary: '#6C757D' },
        firstDayOfWeek: 0,
        isActive: true,
        registeredAt: new Date()
    };
    this.users.push(newUser);
    return newUser;
  }

  public adminToggleUserStatus(userId: string, isActive: boolean) {
      const user = this.users.find(u => u.id === userId);
      if (!user) throw new Error("User not found");
      if (user.role === Role.ADMIN) throw new Error("Cannot deactivate admin.");
      
      user.isActive = isActive;
      
      if (!isActive) {
          this.handleUserDeactivation(user);
      }
  }

  public adminDeleteUser(userId: string) {
      const user = this.users.find(u => u.id === userId);
      if (!user) throw new Error("User not found");
      if (user.role === Role.ADMIN) throw new Error("Cannot delete admin.");
      
      this.handleUserDeactivation(user);
      
      this.users = this.users.filter(u => u.id !== userId);
  }

  private handleUserDeactivation(user: User) {
      const now = new Date();

      if (user.role === Role.TEACHER) {
          // Hard delete all future sessions created by this teacher
          const sessionsToDelete = this.sessions.filter(s => s.teacherId === user.id && s.start > now);
          
          sessionsToDelete.forEach(s => {
              // Notify learners
              s.learnerIds.forEach(lId => {
                  this.createNotification(lId, `Session Cancelled: Your session with ${s.teacherName} on ${s.start.toLocaleString()} has been cancelled because the instructor account is no longer active.`);
              });
          });

          this.sessions = this.sessions.filter(s => !(s.teacherId === user.id && s.start > now));
      
      } else if (user.role === Role.LEARNER) {
          // Remove learner from future sessions
          this.sessions.forEach(s => {
              if (s.start > now && s.learnerIds.includes(user.id)) {
                  const idx = s.learnerIds.indexOf(user.id);
                  if (idx !== -1) {
                      s.learnerIds.splice(idx, 1);
                      s.learnerNames.splice(idx, 1);
                      
                      this.addLog(s.id, 'CANCEL', 'SYSTEM', `Learner ${user.name} removed (Account Deactivated/Deleted)`);
                      this.createNotification(s.teacherId, `Update: ${user.name} was removed from your session on ${s.start.toLocaleString()} due to account deactivation.`);

                      // Update status
                      if (s.type === SessionType.PRACTICE) {
                          s.status = SessionStatus.AVAILABLE;
                          s.cancellationReason = null;
                          s.vehicleId = s.requiresVehicle ? s.vehicleId : null; // Keep vehicle if assigned
                      } else {
                          // Theory
                          if (s.status === SessionStatus.FULL) s.status = SessionStatus.BOOKED;
                          if (s.learnerIds.length === 0) s.status = SessionStatus.AVAILABLE;
                      }
                  }
              }
          });
      }
  }

  // --- Vehicles ---
  public getVehicles(): Vehicle[] {
    return [...this.vehicles];
  }

  public isVehicleAvailable(vehicleId: string, start: Date, end: Date, excludeSessionId?: string): boolean {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    if (!vehicle || vehicle.status !== 'Active') return false;

    return !this.sessions.some(session => 
      session.id !== excludeSessionId &&
      session.vehicleId === vehicleId &&
      (session.status === SessionStatus.BOOKED || session.status === SessionStatus.IN_PROGRESS) &&
      Math.max(session.start.getTime(), start.getTime()) < Math.min(session.end.getTime(), end.getTime())
    );
  }

  public getAvailableVehicles(start: Date, end: Date, excludeSessionId?: string): Vehicle[] {
    return this.vehicles.filter(v => this.isVehicleAvailable(v.id, start, end, excludeSessionId));
  }

  // --- Admin Vehicle Management ---
  public adminCreateVehicle(vehicleData: { name: string; plate: string }): Vehicle {
      if (this.vehicles.some(v => v.plate.toUpperCase() === vehicleData.plate.toUpperCase())) {
          throw new Error("Vehicle with this plate already exists.");
      }
      const newVehicle: Vehicle = {
          id: `v-${Date.now()}`,
          name: vehicleData.name,
          plate: vehicleData.plate,
          status: 'Active'
      };
      this.vehicles.push(newVehicle);
      return newVehicle;
  }

  public adminUpdateVehicleStatus(vehicleId: string, status: Vehicle['status']) {
      const vehicle = this.vehicles.find(v => v.id === vehicleId);
      if (!vehicle) throw new Error("Vehicle not found");
      vehicle.status = status;

      // If vehicle is put into Maintenance or Retired, unassign from future sessions
      if (status !== 'Active') {
          const now = new Date();
          this.sessions.forEach(s => {
              if (s.start > now && s.vehicleId === vehicleId) {
                  s.vehicleId = null;
                  this.addLog(s.id, 'VEHICLE_CHANGE', 'SYSTEM', `Vehicle ${vehicle.name} unassigned (Status: ${status})`);
                  this.createNotification(s.teacherId, `Alert: Vehicle ${vehicle.name} for your session on ${s.start.toLocaleString()} has been unassigned because the vehicle is now ${status}. Please assign a new vehicle.`);
              }
          });
      }
  }

  public adminDeleteVehicle(vehicleId: string) {
      const vehicle = this.vehicles.find(v => v.id === vehicleId);
      this.vehicles = this.vehicles.filter(v => v.id !== vehicleId);
      
      // Unassign from future sessions
      const now = new Date();
      this.sessions.forEach(s => {
          if (s.start > now && s.vehicleId === vehicleId) {
              s.vehicleId = null;
              this.addLog(s.id, 'VEHICLE_CHANGE', 'SYSTEM', `Vehicle ${vehicle?.name} unassigned (Deleted)`);
              this.createNotification(s.teacherId, `Alert: Vehicle ${vehicle?.name} for your session on ${s.start.toLocaleString()} has been deleted. Please assign a new vehicle.`);
          }
      });
  }

  // --- Sessions ---
  public getSessions(): Session[] {
    return [...this.sessions];
  }

  public createSession(data: Partial<Session>, creator: User): Session {
    if (creator.role !== Role.TEACHER) throw new Error("Unauthorized");
    if (!data.start || !data.end || !data.type) throw new Error("Missing required fields");

    const start = new Date(data.start);
    const end = new Date(data.end);

    if (start.getTime() < Date.now()) {
        throw new Error("Cannot create sessions in the past.");
    }

    const isTeacherBusy = this.sessions.some(s => 
      s.teacherId === creator.id &&
      ![SessionStatus.FINISHED, SessionStatus.CANCELLED_BY_TEACHER, SessionStatus.CANCELLED_BY_LEARNER, SessionStatus.CANCELLED_UNBOOKED].includes(s.status) &&
      (start.getTime() < s.end.getTime() && end.getTime() > s.start.getTime())
    );

    if (isTeacherBusy) throw new Error("You already have a session scheduled during this time slot.");

    if (data.requiresVehicle && data.vehicleId) {
        if (!this.isVehicleAvailable(data.vehicleId, start, end)) {
            throw new Error("The selected vehicle is not available during this time.");
        }
    }

    const newSession: Session = {
      id: `session-${Date.now()}`,
      teacherId: creator.id,
      teacherName: creator.name,
      learnerIds: [],
      learnerNames: [],
      start: start,
      end: end,
      status: SessionStatus.AVAILABLE,
      createdAt: new Date(),
      cancellationReason: null,
      requiresVehicle: !!data.requiresVehicle,
      vehicleId: data.vehicleId || null,
      type: data.type,
      capacity: data.type === SessionType.THEORY ? (data.capacity || 10) : undefined,
    };

    this.sessions.push(newSession);
    this.addLog(newSession.id, 'CREATE', creator, `Session created by ${creator.name}`);
    this.createNotification(creator.id, `You successfully created a ${newSession.type} session for ${start.toLocaleString()}.`);

    return newSession;
  }

  public updateSession(sessionId: string, updates: Partial<Session>, updater: User): Session {
    const index = this.sessions.findIndex(s => s.id === sessionId);
    if (index === -1) throw new Error("Session not found");
    if (updater.role !== Role.TEACHER) throw new Error("Unauthorized");

    const currentSession = this.sessions[index];
    const newStart = updates.start ? new Date(updates.start) : currentSession.start;
    const newEnd = updates.end ? new Date(updates.end) : currentSession.end;
    const newVehicleId = updates.vehicleId; 

    // Constraint Checks
    if (currentSession.requiresVehicle && newVehicleId) {
      if (!this.isVehicleAvailable(newVehicleId, newStart, newEnd, sessionId)) {
        throw new Error("The assigned vehicle is not available for the selected time slot.");
      }
    }

    // Detect Changes for Logging
    if (newStart.getTime() !== currentSession.start.getTime()) {
        this.addLog(sessionId, 'RESCHEDULE', updater, `Rescheduled from ${currentSession.start.toLocaleString()} to ${newStart.toLocaleString()}`, { oldStart: currentSession.start, newStart: newStart });
    }
    if (updates.vehicleId && updates.vehicleId !== currentSession.vehicleId) {
        const oldV = this.vehicles.find(v => v.id === currentSession.vehicleId)?.name || 'None';
        const newV = this.vehicles.find(v => v.id === updates.vehicleId)?.name || 'None';
        this.addLog(sessionId, 'VEHICLE_CHANGE', updater, `Vehicle changed from ${oldV} to ${newV}`, { oldVehicle: oldV, newVehicle: newV });
    }

    // Apply Update
    const updatedSession = { ...currentSession, ...updates, start: newStart, end: newEnd };
    this.sessions[index] = updatedSession;

    if (updates.start || updates.end) {
      updatedSession.learnerIds.forEach(uid => 
        this.createNotification(uid, `Your session with ${updatedSession.teacherName} has been rescheduled to ${newStart.toLocaleString()}.`)
      );
    }

    return updatedSession;
  }

  public bookSession(sessionId: string, learner: User, vehicleId?: string): Session {
    const index = this.sessions.findIndex(s => s.id === sessionId);
    if (index === -1) throw new Error("Session not found");
    const session = this.sessions[index];
    const teacher = this.getUserById(session.teacherId);

    // --- Teacher Constraint Checks ---
    if (teacher && teacher.teacherConstraints) {
        const { maxSessionsPerLearnerDaily, maxSessionsPerLearnerWeekly } = teacher.teacherConstraints;

        if (maxSessionsPerLearnerDaily || maxSessionsPerLearnerWeekly) {
            const learnerSessions = this.sessions.filter(s => 
                s.teacherId === teacher.id && 
                s.learnerIds.includes(learner.id) &&
                ![SessionStatus.CANCELLED_BY_LEARNER, SessionStatus.CANCELLED_BY_TEACHER, SessionStatus.CANCELLED_UNBOOKED].includes(s.status)
            );

            if (maxSessionsPerLearnerDaily) {
                const sameDayCount = learnerSessions.filter(s => 
                    s.start.getDate() === session.start.getDate() && 
                    s.start.getMonth() === session.start.getMonth() &&
                    s.start.getFullYear() === session.start.getFullYear()
                ).length;
                if (sameDayCount >= maxSessionsPerLearnerDaily) {
                    throw new Error(`You have reached the daily limit (${maxSessionsPerLearnerDaily}) for booking sessions with ${teacher.name}.`);
                }
            }

            if (maxSessionsPerLearnerWeekly) {
                // Simple week check (same ISO week)
                const getWeekNumber = (d: Date) => {
                    const date = new Date(d.getTime());
                    date.setHours(0, 0, 0, 0);
                    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
                    return 1 + Math.round(((date.getTime() - new Date(date.getFullYear(), 0, 4).getTime()) / 86400000 - 3 + (date.getDay() + 6) % 7) / 7);
                };
                const targetWeek = getWeekNumber(session.start);
                const sameWeekCount = learnerSessions.filter(s => getWeekNumber(s.start) === targetWeek).length;
                if (sameWeekCount >= maxSessionsPerLearnerWeekly) {
                     throw new Error(`You have reached the weekly limit (${maxSessionsPerLearnerWeekly}) for booking sessions with ${teacher.name}.`);
                }
            }
        }
    }
    // ----------------------------------

    if (session.type === SessionType.PRACTICE) {
      if (session.status !== SessionStatus.AVAILABLE) throw new Error("Session is not available.");
      
      session.status = SessionStatus.BOOKED;
      session.learnerIds = [learner.id];
      session.learnerNames = [learner.name];
      
      this.addLog(sessionId, 'BOOK', learner, `${learner.name} booked the session`);
      this.createNotification(session.teacherId, `New Booking: ${learner.name} booked your practice session on ${session.start.toLocaleString()}.`);
      this.createNotification(learner.id, `Booking Confirmed: Practice session with ${session.teacherName} on ${session.start.toLocaleString()}.`);

    } else {
      // Theory Logic
      if ((session.learnerIds.length) >= (session.capacity || 0)) throw new Error("Session full.");
      if (session.learnerIds.includes(learner.id)) throw new Error("Already booked.");

      session.learnerIds.push(learner.id);
      session.learnerNames.push(learner.name);
      
      if (session.learnerIds.length === session.capacity) {
        session.status = SessionStatus.FULL;
      } else {
        session.status = SessionStatus.BOOKED;
      }
      
      this.addLog(sessionId, 'BOOK', learner, `${learner.name} joined the theory session`);
      this.createNotification(session.teacherId, `New Booking: ${learner.name} joined your theory session on ${session.start.toLocaleString()}.`);
      this.createNotification(learner.id, `Booking Confirmed: Theory session with ${session.teacherName} on ${session.start.toLocaleString()}.`);
    }

    this.sessions[index] = session;
    return session;
  }

  public cancelSession(sessionId: string, user: User, reason: string): Session {
    const index = this.sessions.findIndex(s => s.id === sessionId);
    if (index === -1) throw new Error("Session not found");
    const session = this.sessions[index];

    if (user.role === Role.LEARNER) {
      if (session.type === SessionType.PRACTICE) {
        const now = new Date();
        if (session.start > now) {
           session.status = SessionStatus.AVAILABLE;
           session.cancellationReason = null; 
           this.addLog(sessionId, 'CANCEL', user, `Booking cancelled by learner (Reverted to Available)`, { reason });
           
           const oldLearnerName = session.learnerNames[0];
           session.learnerIds = [];
           session.learnerNames = [];
           
           this.createNotification(session.teacherId, `Update: ${oldLearnerName} cancelled their booking for ${session.start.toLocaleString()}. The session is now available for others.`);
        } else {
           session.status = SessionStatus.CANCELLED_BY_LEARNER;
           session.cancellationReason = reason;
           this.addLog(sessionId, 'CANCEL', user, `Session cancelled by learner`, { reason });
           this.createNotification(session.teacherId, `Cancellation: ${session.learnerNames[0]} cancelled the session on ${session.start.toLocaleString()}. Reason: ${reason}`);
        }
      } else {
        // Theory
        const learnerIndex = session.learnerIds.indexOf(user.id);
        if (learnerIndex > -1) {
          session.learnerIds.splice(learnerIndex, 1);
          session.learnerNames.splice(learnerIndex, 1);
          if (session.status === SessionStatus.FULL) session.status = SessionStatus.BOOKED;
          if (session.learnerIds.length === 0) session.status = SessionStatus.AVAILABLE;
          this.addLog(sessionId, 'CANCEL', user, `Learner left theory session`, { reason });
          this.createNotification(session.teacherId, `Cancellation: ${user.name} left your theory session on ${session.start.toLocaleString()}.`);
        }
      }
      this.createNotification(user.id, `You cancelled/left the session on ${session.start.toLocaleString()}.`);
    } else if (user.role === Role.TEACHER) {
      session.status = SessionStatus.CANCELLED_BY_TEACHER;
      session.cancellationReason = reason;
      this.addLog(sessionId, 'CANCEL', user, `Session cancelled by Teacher`, { reason });
      session.learnerIds.forEach(id => 
        this.createNotification(id, `Alert: Your session with ${session.teacherName} at ${session.start.toLocaleString()} was cancelled by the instructor. Reason: ${reason}`)
      );
      this.createNotification(user.id, `You cancelled the session on ${session.start.toLocaleString()}.`);
    }

    this.sessions[index] = session;
    return session;
  }

  public deleteSession(sessionId: string, user: User) {
    if (user.role !== Role.TEACHER) throw new Error("Unauthorized");
    // In a real DB we might soft delete, here we actually remove it, so logs would be orphaned unless we kept them elsewhere.
    // For simplicity in this in-memory demo, we remove it.
    this.sessions = this.sessions.filter(s => s.id !== sessionId);
    this.createNotification(user.id, "Session deleted successfully.");
  }

  public markSessionFinished(sessionId: string, user: User): Session {
     if (user.role !== Role.TEACHER) throw new Error("Unauthorized");
     const index = this.sessions.findIndex(s => s.id === sessionId);
     if (index === -1) throw new Error("Session not found");
     
     this.sessions[index].status = SessionStatus.FINISHED;
     this.addLog(sessionId, 'FINISH', user, `Session marked as finished`);
     
     this.sessions[index].learnerIds.forEach(id => 
        this.createNotification(id, `Session Finished: Your session at ${this.sessions[index].start.toLocaleString()} has been marked as complete.`)
     );
     this.createNotification(user.id, `Session Finished: The session at ${this.sessions[index].start.toLocaleString()} is complete.`);

     return this.sessions[index];
  }

  public updateSessionStatuses(): { changed: boolean, sessions: Session[] } {
    const now = new Date();
    let changed = false;

    this.sessions = this.sessions.map(s => {
        if (now >= s.end && s.status === SessionStatus.IN_PROGRESS) {
            s.learnerIds.forEach(id => this.createNotification(id, `Your session at ${s.start.toLocaleString()} has finished.`));
            this.createNotification(s.teacherId, `Your session at ${s.start.toLocaleString()} has finished.`);
            this.addLog(s.id, 'FINISH', 'SYSTEM', 'Auto-finished by system time');
            changed = true;
            return { ...s, status: SessionStatus.FINISHED };
        }
        if (now >= s.start && now < s.end && (s.status === SessionStatus.BOOKED || s.status === SessionStatus.FULL)) {
            s.learnerIds.forEach(id => this.createNotification(id, `Your session at ${s.start.toLocaleString()} has started.`));
            this.createNotification(s.teacherId, `Your session at ${s.start.toLocaleString()} has started.`);
            this.addLog(s.id, 'STATUS_CHANGE', 'SYSTEM', 'Started (In Progress)');
            changed = true;
            return { ...s, status: SessionStatus.IN_PROGRESS };
        }
        if (now >= s.start && s.status === SessionStatus.AVAILABLE) {
            this.createNotification(s.teacherId, `System: Your unbooked session at ${s.start.toLocaleString()} has expired and was cancelled.`);
            this.addLog(s.id, 'STATUS_CHANGE', 'SYSTEM', 'Expired (Cancelled Unbooked)');
            changed = true;
            return { ...s, status: SessionStatus.CANCELLED_UNBOOKED };
        }
        return s;
    });

    return { changed, sessions: [...this.sessions] };
  }

  // --- Offline Forecasting (Linear Regression) ---
  // Helper for Regression
  private calculateRegression(yValues: number[]) {
      const n = yValues.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (let x = 0; x < n; x++) {
          const y = yValues[x];
          sumX += x;
          sumY += y;
          sumXY += x * y;
          sumXX += x * x;
      }
      const denominator = (n * sumXX - sumX * sumX);
      if (denominator === 0) return { m: 0, b: 0 }; // Avoid division by zero
      
      const m = (n * sumXY - sumX * sumY) / denominator;
      const b = (sumY - m * sumX) / n;
      return { m, b };
  }

  public getOfflineForecast(): GeminiAnalysisResult {
      // 1. Aggregate data by week for Bookings
      const bookingData: { [week: string]: number } = {};
      this.sessions.forEach(s => {
          if (s.type === SessionType.PRACTICE && s.learnerIds.length > 0) {
             const week = this.getWeekKey(s.start);
             bookingData[week] = (bookingData[week] || 0) + 1;
          }
      });

      // 2. Aggregate data by week for Registrations
      const registrationData: { [week: string]: number } = {};
      this.users.forEach(u => {
          if (u.role === Role.LEARNER && u.registeredAt) {
              const week = this.getWeekKey(u.registeredAt);
              registrationData[week] = (registrationData[week] || 0) + 1;
          }
      });

      const sortedWeeks = Array.from(new Set([...Object.keys(bookingData), ...Object.keys(registrationData)])).sort();
      const n = sortedWeeks.length;

      if (n < 2) {
          return {
              analysisHtml: "<p>Not enough data to forecast trends.</p>",
              forecast: []
          };
      }

      // 3. Calculate Regressions
      const bookingY = sortedWeeks.map(w => bookingData[w] || 0);
      const regY = sortedWeeks.map(w => registrationData[w] || 0);

      const { m: mBook, b: bBook } = this.calculateRegression(bookingY);
      const { m: mReg, b: bReg } = this.calculateRegression(regY);

      // 4. Generate Forecast
      const forecast: ForecastData[] = [];
      let lastWeekKey = sortedWeeks[n-1];
      let [year, weekNum] = lastWeekKey.split('-W').map(Number);

      for (let i = 1; i <= 4; i++) {
          weekNum++;
          if (weekNum > 52) { year++; weekNum = 1; }
          const nextWeekKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;
          
          const x = n - 1 + i; 
          const predBook = Math.max(0, Math.round(mBook * x + bBook));
          const predReg = Math.max(0, Math.round(mReg * x + bReg));

          forecast.push({ 
              week: nextWeekKey, 
              predictedBookings: predBook,
              predictedRegistrations: predReg
          });
      }

      // 5. Analysis Text
      const avgBook = (bookingY.reduce((a, b) => a + b, 0) / n).toFixed(1);
      const avgReg = (regY.reduce((a, b) => a + b, 0) / n).toFixed(1);
      
      const analysisHtml = `
        <h4>Statistical Trend Report</h4>
        <ul>
            <li><strong>Booking Trend:</strong> ${mBook > 0 ? 'Growing' : 'Declining'} (Avg: ${avgBook}/week).</li>
            <li><strong>User Growth:</strong> ${mReg > 0 ? 'Growing' : 'Declining'} (Avg: ${avgReg} new learners/week).</li>
            <li><strong>Projected Next Week:</strong> ${forecast[0].predictedBookings} sessions & ${forecast[0].predictedRegistrations} new registrations.</li>
        </ul>
      `;

      return { analysisHtml, forecast };
  }

  private getWeekKey(d: Date): string {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    const week = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
  }


  // --- Smart Booking (Constraint/Heuristic) ---
  public generateSmartSchedule(learnerId: string, prefs: SmartBookingPreferences): ScoredSession[] {
    const learner = this.getUserById(learnerId);
    if (!learner) throw new Error("Learner not found");

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const userBookings = this.sessions.filter(s => 
      s.learnerIds.includes(learnerId) && 
      ![SessionStatus.FINISHED, SessionStatus.CANCELLED_BY_LEARNER, SessionStatus.CANCELLED_BY_TEACHER, SessionStatus.CANCELLED_UNBOOKED].includes(s.status)
    );

    const candidates = this.sessions.filter(s => 
      s.type === SessionType.PRACTICE &&
      s.status === SessionStatus.AVAILABLE &&
      s.start > now && s.start < nextWeek
    );

    const scored: ScoredSession[] = [];

    for (const session of candidates) {
      const hasOverlap = userBookings.some(booking => 
        Math.max(booking.start.getTime(), session.start.getTime()) < Math.min(booking.end.getTime(), session.end.getTime())
      );
      if (hasOverlap) continue;

      let score = 0;
      const reasons: string[] = [];

      if (prefs.preferredTeacherId !== 'any' && session.teacherId === prefs.preferredTeacherId) {
        score += 30;
        reasons.push('Preferred Teacher');
      }

      if (prefs.preferredDays && prefs.preferredDays.includes(session.start.getDay())) {
         score += 20;
         reasons.push('Preferred Day');
      }

      const hour = session.start.getHours();
      let isTimeMatch = false;
      if (prefs.preferredTime === 'Morning' && hour >= 6 && hour < 12) isTimeMatch = true;
      if (prefs.preferredTime === 'Afternoon' && hour >= 12 && hour < 17) isTimeMatch = true;
      if (prefs.preferredTime === 'Evening' && hour >= 17) isTimeMatch = true;
      
      if (isTimeMatch) {
        score += 50;
        reasons.push(`Matches ${prefs.preferredTime} preference`);
      }

      score += Math.random() * 10;
      scored.push({ ...session, score, matchReasons: reasons });
    }

    scored.sort((a, b) => b.score - a.score);

    const result: ScoredSession[] = [];
    
    for (const candidate of scored) {
        if (result.length >= prefs.sessionCount) break;
        const overlapsWithPicked = result.some(picked => 
            Math.max(picked.start.getTime(), candidate.start.getTime()) < Math.min(picked.end.getTime(), candidate.end.getTime())
        );
        if (!overlapsWithPicked) {
            result.push(candidate);
        }
    }
    return result;
  }

  // --- Notifications ---
  public createNotification(userId: string, message: string) {
    this.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random()}`,
      userId,
      message,
      read: false,
      timestamp: new Date()
    });
  }

  public getNotifications(userId: string): Notification[] {
    return this.notifications.filter(n => n.userId === userId);
  }

  public markNotificationsRead(userId: string) {
    this.notifications = this.notifications.map(n => 
      n.userId === userId ? { ...n, read: true } : n
    );
  }
}

export const db = new DatabaseService();
