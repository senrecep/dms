"use client";

import { useEffect, useRef } from "react";
import { useSSE } from "@/hooks/use-sse";
import { useNotificationStore } from "@/stores/notification-store";
import { getNotifications } from "@/actions/notifications";

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { on } = useSSE();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const initializedRef = useRef(false);

  // Load initial notifications
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function loadInitial() {
      try {
        const result = await getNotifications(1, 20);
        const mapped = result.notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          read: n.isRead,
          createdAt: n.createdAt,
          metadata: {
            relatedDocumentId: n.relatedDocumentId,
            relatedDocument: n.relatedDocument,
          },
        }));
        setNotifications(mapped);
      } catch {
        // silently fail on initial load
      }
    }

    loadInitial();
  }, [setNotifications]);

  // Listen for real-time notifications via SSE
  useEffect(() => {
    const unsubscribe = on("NOTIFICATION", (data) => {
      const d = data as {
        id: string;
        type: string;
        title: string;
        message: string;
        relatedDocumentId?: string;
      };
      addNotification({
        id: d.id,
        type: d.type,
        title: d.title,
        message: d.message,
        read: false,
        createdAt: new Date(),
        metadata: { relatedDocumentId: d.relatedDocumentId },
      });
    });

    return unsubscribe;
  }, [on, addNotification]);

  return <>{children}</>;
}
