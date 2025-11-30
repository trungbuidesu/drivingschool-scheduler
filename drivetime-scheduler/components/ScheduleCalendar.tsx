
import React, { useMemo, useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Session, Role, SessionStatus, User, Vehicle, SessionType } from '../types';
// FIX: The EventResizeDoneArg type is not exported from '@fullcalendar/core'. Use EventApi for a structural type instead.
import { EventClickArg, EventInput, DateSelectArg, EventDropArg, EventHoveringArg, EventApi, DateSpanApi } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
import { toast } from 'react-hot-toast';
import { SessionTooltip } from './SessionTooltip';
import { VEHICLES } from '../sample_data';
import { Avatar } from './Avatar';


interface ScheduleCalendarProps {
  sessions: Session[];
  role: Role;
  currentUser: User | null;
  users: User[];
  onInitiateCreate: (start: Date, end: Date) => void;
  onUpdateSession: (sessionId: string, start: Date, end: Date) => void;
  onEventClick: (data: Session | Session[]) => void;
}

const getEventColor = (status: SessionStatus) => {
  switch (status) {
    case SessionStatus.AVAILABLE: return '#28A745'; // success
    case SessionStatus.BOOKED: return '#007BFF'; // primary
    case SessionStatus.FULL: return '#6f42c1'; // purple
    case SessionStatus.IN_PROGRESS: return '#FFC107'; // warning
    case SessionStatus.FINISHED: return '#6C757D'; // secondary
    case SessionStatus.CANCELLED_BY_LEARNER:
    case SessionStatus.CANCELLED_BY_TEACHER:
    case SessionStatus.CANCELLED_UNBOOKED:
      return '#DC3545'; // danger
    default: return '#17A2B8'; // info
  }
};

interface TooltipState {
  visible: boolean;
  content: Session | null;
  vehicle: Vehicle | null;
  rect: DOMRect | null;
  containerRect: DOMRect | null;
  mouseEvent: MouseEvent | null;
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ sessions, role, currentUser, users, onInitiateCreate, onUpdateSession, onEventClick }) => {
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, content: null, vehicle: null, rect: null, containerRect: null, mouseEvent: null });
  const [sessionTypeFilter, setSessionTypeFilter] = useState<'all' | 'Practice' | 'Theory'>('all');
  const teachers = useMemo(() => users.filter(u => u.role === Role.TEACHER), [users]);
  
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>(() => {
    if (role === Role.TEACHER && currentUser) return [currentUser.id];
    return teachers.map(t => t.id);
  });

  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const teacherDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teacherDropdownRef.current && !teacherDropdownRef.current.contains(event.target as Node)) {
        setIsTeacherDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleTeacher = (teacherId: string) => {
    setSelectedTeacherIds(prev =>
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleSelectAllTeachers = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTeacherIds(e.target.checked ? teachers.map(t => t.id) : []);
  };

  const sessionToEvent = (session: Session): EventInput => {
    let title = '';
    if (session.type === SessionType.THEORY) {
      title = `Theory (${session.learnerIds.length}/${session.capacity || '∞'})`;
    } else {
      title = `Practice - ${session.learnerNames.length > 0 ? session.learnerNames[0] : 'Available'}`;
    }
    
    const isEditable = role === Role.TEACHER && ![SessionStatus.FINISHED, SessionStatus.CANCELLED_BY_LEARNER, SessionStatus.CANCELLED_BY_TEACHER, SessionStatus.CANCELLED_UNBOOKED].includes(session.status);

    return {
      id: session.id,
      title: title,
      start: session.start,
      end: session.end,
      backgroundColor: getEventColor(session.status),
      borderColor: getEventColor(session.status),
      extendedProps: { ...session, isGroup: false },
      editable: isEditable,
      eventResizableFromStart: isEditable,
    };
  };

  const events = useMemo<EventInput[]>(() => {
    const filteredSessions = sessions.filter(s =>
      (sessionTypeFilter === 'all' || s.type === sessionTypeFilter) &&
      selectedTeacherIds.includes(s.teacherId) &&
      (role !== Role.LEARNER || (s.status === SessionStatus.AVAILABLE || s.learnerIds.includes(currentUser!.id)))
    );

    if (selectedTeacherIds.length <= 1) {
      return filteredSessions.map(sessionToEvent);
    }

    const sortedSessions = [...filteredSessions].sort((a, b) => a.start.getTime() - b.start.getTime());
    const finalEvents: EventInput[] = [];
    const processedSessionIds = new Set<string>();

    for (const session of sortedSessions) {
      if (processedSessionIds.has(session.id)) continue;

      const overlappingGroup = [session];
      processedSessionIds.add(session.id);

      for (const otherSession of sortedSessions) {
        if (processedSessionIds.has(otherSession.id)) continue;

        const groupHasTeacher = overlappingGroup.some(s => s.teacherId === otherSession.teacherId);
        const overlapsWithGroup = overlappingGroup.some(s => Math.max(s.start.getTime(), otherSession.start.getTime()) < Math.min(s.end.getTime(), otherSession.end.getTime()));

        if (!groupHasTeacher && overlapsWithGroup) {
          overlappingGroup.push(otherSession);
          processedSessionIds.add(otherSession.id);
        }
      }

      if (overlappingGroup.length > 1) {
        const groupStart = new Date(Math.min(...overlappingGroup.map(s => s.start.getTime())));
        const groupEnd = new Date(Math.max(...overlappingGroup.map(s => s.end.getTime())));
        finalEvents.push({
          id: `group-${groupStart.getTime()}`,
          title: `${overlappingGroup.length} Overlapping Sessions`,
          start: groupStart,
          end: groupEnd,
          backgroundColor: '#6C757D',
          borderColor: '#6C757D',
          extendedProps: { children: overlappingGroup, isGroup: true },
          editable: false,
        });
      } else {
        finalEvents.push(sessionToEvent(session));
      }
    }
    return finalEvents;

  }, [sessions, sessionTypeFilter, selectedTeacherIds, role, currentUser]);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const props = clickInfo.event.extendedProps;
    if (props.isGroup) {
      onEventClick(props.children as Session[]);
    } else {
      onEventClick(props as Session);
    }
  };
  
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (role !== Role.TEACHER) return;

    // Check Past
    if (new Date() > selectInfo.start) { 
        selectInfo.view.calendar.unselect(); // Immediate cleanup of UI
        toast.error('Cannot create in the past.'); 
        return; 
    }
    
    // Check Duration
    if (selectInfo.end.getTime() - selectInfo.start.getTime() < 1800000) { 
        selectInfo.view.calendar.unselect(); // Immediate cleanup of UI
        toast.error('Sessions must be at least 30 minutes.'); 
        return; 
    }

    // Check Multi-day
    // Although selectAllow handles dragging, this catches programmatic selection or edge cases
    const isSameDay = selectInfo.start.getDate() === selectInfo.end.getDate() || 
                      (selectInfo.end.getDate() === selectInfo.start.getDate() + 1 && selectInfo.end.getHours() === 0 && selectInfo.end.getMinutes() === 0);
    
    if (!isSameDay) {
        selectInfo.view.calendar.unselect();
        toast.error('Sessions cannot span multiple days.');
        return;
    }

    onInitiateCreate(selectInfo.start, selectInfo.end);
  };
  
  // Control what selections are allowed during the drag operation
  const handleSelectAllow = (selectInfo: DateSpanApi) => {
      const start = selectInfo.start;
      const end = selectInfo.end;
      
      // Do not allow multi-day selections
      // Allow selecting up to 00:00 of the next day, but not starting into the next day
      const isMultiDay = start.getDate() !== end.getDate() && !(end.getHours() === 0 && end.getMinutes() === 0 && end.getTime() - start.getTime() <= 86400000);
      
      return !isMultiDay;
  };
  
  // FIX: The EventResizeDoneArg type is not exported from FullCalendar.
  const handleEventDropOrResize = (info: { event: EventApi, revert: () => void }) => {
      const { start, end, id } = info.event;
      if (!start || !end) return;

      if (start < new Date()) {
          toast.error('Cannot move or resize event into the past.');
          info.revert();
          return;
      }
      if (end.getTime() - start.getTime() < 1800000) { // 30 mins minimum
          toast.error(`Sessions must be at least 30 minutes.`);
          info.revert();
          return;
      }
      onUpdateSession(id, start, end);
  };

  const handleEventMouseEnter = (hoverInfo: EventHoveringArg) => {
    const props = hoverInfo.event.extendedProps;
    if (props.isGroup) return;

    const containerRect = calendarContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const session = props as Session;
    const vehicle = session.vehicleId ? VEHICLES.find(v => v.id === session.vehicleId) || null : null;
    
    setTooltip({ 
        visible: true, 
        content: session, 
        vehicle, 
        rect: hoverInfo.el.getBoundingClientRect(), 
        containerRect: containerRect, 
        mouseEvent: hoverInfo.jsEvent as MouseEvent 
    });
  };

  const handleEventMouseLeave = () => setTooltip({ visible: false, content: null, vehicle: null, rect: null, containerRect: null, mouseEvent: null });

  return (
    <div ref={calendarContainerRef} className="relative p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:items-center">
        <div>
          <span className="font-semibold mr-3 text-gray-700 dark:text-gray-300">Type:</span>
          <div className="inline-flex rounded-md shadow-sm bg-white dark:bg-gray-900 p-1" role="group">
            {(['all', 'Practice', 'Theory'] as const).map(type => (
              <button key={type} onClick={() => setSessionTypeFilter(type)}
                className={`px-3 py-1 text-sm font-medium transition-colors duration-200 rounded-md ${sessionTypeFilter === type ? 'bg-primary text-white' : 'text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {role !== Role.TEACHER && (
          <div className="relative" ref={teacherDropdownRef}>
            <button onClick={() => setIsTeacherDropdownOpen(o => !o)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full sm:w-[200px]">
              Select Teachers ({selectedTeacherIds.length})
              <svg className="ml-auto h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 9 6 6 6-6"></path></svg>
            </button>
            {isTeacherDropdownOpen && (
              <div className="absolute z-10 w-full sm:w-64 mt-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 max-h-60 overflow-y-auto">
                <ul className="p-2 space-y-1">
                  <li><label className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"><input type="checkbox" checked={selectedTeacherIds.length === teachers.length} onChange={handleSelectAllTeachers} className="h-4 w-4 mr-3 rounded"/> All Teachers</label></li>
                  {teachers.map(teacher => (
                    <li key={teacher.id}>
                      <label className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                        <input type="checkbox" checked={selectedTeacherIds.includes(teacher.id)} onChange={() => handleToggleTeacher(teacher.id)} className="h-4 w-4 mr-3 rounded"/>
                        <Avatar user={teacher} size="sm" />
                        <span className="ml-2 text-sm font-medium">{teacher.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
        initialView="timeGridWeek"
        events={events}
        editable={role === Role.TEACHER}
        selectable={role === Role.TEACHER}
        selectAllow={handleSelectAllow}
        selectMirror={true}
        dayMaxEvents={true}
        eventClick={handleEventClick}
        select={handleDateSelect}
        eventDrop={handleEventDropOrResize}
        eventResize={handleEventDropOrResize}
        eventMouseEnter={handleEventMouseEnter}
        eventMouseLeave={handleEventMouseLeave}
        height="80vh"
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        nowIndicator={true}
        firstDay={currentUser?.firstDayOfWeek || 0}
      />
      {tooltip.visible && <SessionTooltip {...tooltip} />}
      <style>{`
        .fc-event { cursor: pointer; }
        .fc .fc-button-primary { background-color: #007BFF; border-color: #007BFF; }
        .fc .fc-day-today { background-color: rgba(0, 123, 255, 0.1) !important; }
        .dark .fc .fc-day-today { background-color: rgba(0, 123, 255, 0.2) !important; }
        .fc-now-indicator-line { border-color: red; border-width: 2px; }
        .fc-now-indicator-arrow { border-color: red; border-width: 5px; }
      `}</style>
    </div>
  );
};
