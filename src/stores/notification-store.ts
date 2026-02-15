import { create } from "zustand";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
}

interface NotificationActions {
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setNotifications: (notifications: Notification[]) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
}

export const useNotificationStore = create<NotificationState & NotificationActions>(
  (set) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    addNotification: (notification) =>
      set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
      })),

    markAsRead: (id) =>
      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        if (!notification || notification.read) return state;
        return {
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        };
      }),

    markAllAsRead: () =>
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      })),

    setNotifications: (notifications) =>
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      }),

    incrementUnread: () =>
      set((state) => ({ unreadCount: state.unreadCount + 1 })),

    decrementUnread: () =>
      set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  })
);
