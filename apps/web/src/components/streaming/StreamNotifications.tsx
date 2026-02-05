"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

interface StreamNotification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  duration?: number;
}

interface StreamNotificationsContextType {
  notify: (notification: Omit<StreamNotification, "id">) => void;
  notifyStreamStarted: (platform: string) => void;
  notifyStreamEnded: (stats?: { duration: number; viewers: number }) => void;
  notifyStreamError: (error: string) => void;
}

const StreamNotificationsContext = createContext<StreamNotificationsContextType | null>(null);

export function useStreamNotifications() {
  const context = useContext(StreamNotificationsContext);
  if (!context) {
    throw new Error("useStreamNotifications must be used within StreamNotificationsProvider");
  }
  return context;
}

export function StreamNotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<StreamNotification[]>([]);

  const notify = useCallback((notification: Omit<StreamNotification, "id">) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const duration = notification.duration || 5000;

    setNotifications((prev) => [...prev, { ...notification, id }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  }, []);

  const notifyStreamStarted = useCallback(
    (platform: string) => {
      notify({
        type: "success",
        title: "Stream Started",
        message: `Your stream is now live on ${platform}!`,
        duration: 5000,
      });
    },
    [notify]
  );

  const notifyStreamEnded = useCallback(
    (stats?: { duration: number; viewers: number }) => {
      notify({
        type: "info",
        title: "Stream Ended",
        message: stats
          ? `Stream ended. Duration: ${formatDuration(stats.duration)}, Peak viewers: ${stats.viewers}`
          : "Your stream has ended.",
        duration: 7000,
      });
    },
    [notify]
  );

  const notifyStreamError = useCallback(
    (error: string) => {
      notify({
        type: "error",
        title: "Stream Error",
        message: error,
        duration: 8000,
      });
    },
    [notify]
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <StreamNotificationsContext.Provider
      value={{ notify, notifyStreamStarted, notifyStreamEnded, notifyStreamError }}
    >
      {children}
      <StreamNotificationsDisplay
        notifications={notifications}
        onRemove={removeNotification}
      />
    </StreamNotificationsContext.Provider>
  );
}

function StreamNotificationsDisplay({
  notifications,
  onRemove,
}: {
  notifications: StreamNotification[];
  onRemove: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div className="stream-notifications-container">
      {notifications.map((notification) => (
        <StreamNotificationToast
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
      <style jsx>{`
        .stream-notifications-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 400px;
        }

        @media (max-width: 640px) {
          .stream-notifications-container {
            left: 20px;
            right: 20px;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}

function StreamNotificationToast({
  notification,
  onRemove,
}: {
  notification: StreamNotification;
  onRemove: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = notification.duration || 5000;
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(notification.id), 300);
    }, duration);

    return () => clearTimeout(exitTimer);
  }, [notification, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(notification.id), 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
      default:
        return "ℹ️";
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case "success":
        return {
          bg: "rgba(16, 185, 129, 0.1)",
          border: "rgba(16, 185, 129, 0.4)",
          text: "#6ee7b7",
        };
      case "error":
        return {
          bg: "rgba(220, 38, 38, 0.1)",
          border: "rgba(220, 38, 38, 0.4)",
          text: "#fca5a5",
        };
      case "warning":
        return {
          bg: "rgba(251, 191, 36, 0.1)",
          border: "rgba(251, 191, 36, 0.4)",
          text: "#fcd34d",
        };
      case "info":
      default:
        return {
          bg: "rgba(59, 130, 246, 0.1)",
          border: "rgba(59, 130, 246, 0.4)",
          text: "#93c5fd",
        };
    }
  };

  const colors = getColors();

  return (
    <div className={`stream-notification-toast ${isExiting ? "exiting" : ""}`}>
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-content">
        <div className="notification-title">{notification.title}</div>
        <div className="notification-message">{notification.message}</div>
      </div>
      <button onClick={handleClose} className="notification-close">
        ×
      </button>
      <style jsx>{`
        .stream-notification-toast {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: ${colors.bg};
          border: 1px solid ${colors.border};
          border-radius: 12px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          animation: slideIn 0.3s ease-out;
        }

        .stream-notification-toast.exiting {
          animation: slideOut 0.3s ease-in;
        }

        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }

        .notification-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
        }

        .notification-title {
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 4px;
          color: ${colors.text};
        }

        .notification-message {
          font-size: 13px;
          opacity: 0.9;
          line-height: 1.4;
          color: white;
        }

        .notification-close {
          flex-shrink: 0;
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-close:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}
