"use client";

import { useEffect, useRef } from "react";

interface GameEvent {
  eventId?: string;
  _id?: string;
  eventType?: string;
  description: string;
  playerUsername?: string;
  timestamp?: number;
}

interface EventFeedTickerProps {
  events: GameEvent[];
}

export function EventFeedTicker({ events }: EventFeedTickerProps) {
  const tickerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest event
  useEffect(() => {
    if (tickerRef.current) {
      tickerRef.current.scrollLeft = tickerRef.current.scrollWidth;
    }
  }, [events]);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="event-ticker">
      <div className="event-ticker__label">
        <span className="event-ticker__icon">⚡</span>
        LIVE
      </div>
      <div className="event-ticker__scroll" ref={tickerRef}>
        <div className="event-ticker__content">
          {events.map((event, idx) => (
            <span key={event.eventId || event._id || idx} className="event-ticker__event">
              {event.playerUsername && (
                <span className="event-ticker__player">{event.playerUsername}</span>
              )}
              <span className="event-ticker__description">{event.description}</span>
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        .event-ticker {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.8);
          padding: 12px 20px;
          gap: 16px;
        }

        .event-ticker__label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #e91e63;
          border-radius: 6px;
          font-weight: 700;
          font-size: 14px;
          white-space: nowrap;
        }

        .event-ticker__icon {
          font-size: 16px;
        }

        .event-ticker__scroll {
          flex: 1;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .event-ticker__scroll::-webkit-scrollbar {
          display: none;
        }

        .event-ticker__content {
          display: flex;
          gap: 32px;
          white-space: nowrap;
        }

        .event-ticker__event {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .event-ticker__player {
          font-weight: 600;
          color: #64b5f6;
        }

        .event-ticker__description {
          opacity: 0.9;
        }

        .event-ticker__event::after {
          content: "•";
          margin-left: 32px;
          opacity: 0.3;
        }

        .event-ticker__event:last-child::after {
          display: none;
        }
      `}</style>
    </div>
  );
}
