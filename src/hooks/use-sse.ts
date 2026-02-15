"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export type SSEEventType =
  | "NOTIFICATION"
  | "APPROVAL_UPDATE"
  | "DOCUMENT_STATUS"
  | "READ_CONFIRMATION";

export type ConnectionState = "connecting" | "connected" | "disconnected";

type EventHandler = (data: unknown) => void;

interface UseSSEOptions {
  url?: string;
  onConnectionChange?: (state: ConnectionState) => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const { url = "/api/sse", onConnectionChange } = options;
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef<Map<SSEEventType, Set<EventHandler>>>(new Map());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttemptRef = useRef(0);

  const updateState = useCallback(
    (state: ConnectionState) => {
      setConnectionState(state);
      onConnectionChange?.(state);
    },
    [onConnectionChange],
  );

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    updateState("connecting");
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      reconnectAttemptRef.current = 0;
      updateState("connected");
    });

    const eventTypes: SSEEventType[] = [
      "NOTIFICATION",
      "APPROVAL_UPDATE",
      "DOCUMENT_STATUS",
      "READ_CONFIRMATION",
    ];

    for (const eventType of eventTypes) {
      es.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const handlers = handlersRef.current.get(eventType);
          if (handlers) {
            for (const handler of handlers) {
              handler(data);
            }
          }
        } catch {
          // skip malformed events
        }
      });
    }

    es.onerror = () => {
      es.close();
      updateState("disconnected");

      const attempt = reconnectAttemptRef.current++;
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };
  }, [url, updateState]);

  const on = useCallback((event: SSEEventType, handler: EventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    return () => {
      handlersRef.current.get(event)?.delete(handler);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      updateState("disconnected");
    };
  }, [connect, updateState]);

  return { connectionState, on };
}
