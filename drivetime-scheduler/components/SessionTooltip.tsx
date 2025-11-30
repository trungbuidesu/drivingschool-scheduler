
import React from 'react';
import { Session, SessionType, Vehicle } from '../types';

interface SessionTooltipProps {
  visible: boolean;
  content: Session | null;
  vehicle: Vehicle | null;
  rect: DOMRect | null;
  containerRect: DOMRect | null;
  mouseEvent: MouseEvent | null;
}

export const SessionTooltip: React.FC<SessionTooltipProps> = ({ visible, content, vehicle, rect, containerRect, mouseEvent }) => {
  if (!visible || !content || !rect || !containerRect || !mouseEvent) {
    return null;
  }
  
  const tooltipWidth = 256;
  const spacing = 15;

  // Calculate position relative to the container
  let left = (rect.right - containerRect.left) + spacing;
  let top = (mouseEvent.clientY - containerRect.top);

  // Flip to left if not enough space on the right (viewport check)
  if (rect.right + spacing + tooltipWidth > window.innerWidth) {
      left = (rect.left - containerRect.left) - tooltipWidth - spacing;
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${top}px`,
    left: `${left}px`,
    pointerEvents: 'none',
    transform: 'translateY(-50%)',
    zIndex: 50,
  };

  // Safe access
  const learners = content.learnerNames || [];
  const truncatedLearners = learners.slice(0, 5).join(', ');
  const hasMoreLearners = learners.length > 5;

  return (
    <div style={style} className="z-50 p-3 rounded-md shadow-lg bg-gray-800 text-white text-sm w-64">
      <h4 className="font-bold text-base mb-2 border-b border-gray-600 pb-1">{content.type} Session</h4>
      <div className="space-y-1">
        <p><strong>Time:</strong> {content.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {content.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        <p><strong>Teacher:</strong> {content.teacherName}</p>
        
        {content.type === SessionType.PRACTICE ? (
            <p><strong>Learner:</strong> {learners[0] || <span className="text-gray-400 italic">Available</span>}</p>
        ) : (
            <>
                <p><strong>Attendees:</strong> {content.learnerIds?.length || 0} / {content.capacity}</p>
                {learners.length > 0 && 
                    <p><strong>Booked:</strong> {truncatedLearners}{hasMoreLearners ? '...' : ''}</p>
                }
            </>
        )}

        <p><strong>Vehicle:</strong> {vehicle?.name || <span className="text-gray-400 italic">None</span>}</p>
        <p><strong>Status:</strong> <span className="font-semibold">{content.status}</span></p>
      </div>
    </div>
  );
};
