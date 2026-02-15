import { subscribe, CHANNELS } from "@/lib/redis/pubsub";

export type SSEEvent =
  | "NOTIFICATION"
  | "APPROVAL_UPDATE"
  | "DOCUMENT_STATUS"
  | "READ_CONFIRMATION";

export interface SSEMessage {
  event: SSEEvent;
  data: unknown;
  id?: string;
}

interface Connection {
  controller: ReadableStreamDefaultController;
  unsubscribes: Array<() => Promise<void>>;
}

const connections = new Map<string, Set<Connection>>();

function formatSSE(message: SSEMessage): string {
  let output = "";
  if (message.id) output += `id: ${message.id}\n`;
  output += `event: ${message.event}\n`;
  output += `data: ${JSON.stringify(message.data)}\n\n`;
  return output;
}

export async function addConnection(
  userId: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
): Promise<Connection> {
  const connection: Connection = { controller, unsubscribes: [] };

  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(connection);

  const unsubNotifications = await subscribe(
    CHANNELS.notifications(userId),
    (message) => {
      try {
        const parsed = JSON.parse(message);
        controller.enqueue(
          encoder.encode(
            formatSSE({
              event: parsed.event ?? "NOTIFICATION",
              data: parsed.data ?? parsed,
              id: parsed.id,
            }),
          ),
        );
      } catch {
        // skip malformed messages
      }
    },
  );
  connection.unsubscribes.push(unsubNotifications);

  const unsubApprovals = await subscribe(CHANNELS.approvals, (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.targetUserId && parsed.targetUserId !== userId) return;
      controller.enqueue(
        encoder.encode(
          formatSSE({
            event: "APPROVAL_UPDATE",
            data: parsed.data ?? parsed,
            id: parsed.id,
          }),
        ),
      );
    } catch {
      // skip malformed messages
    }
  });
  connection.unsubscribes.push(unsubApprovals);

  return connection;
}

export async function removeConnection(
  userId: string,
  connection: Connection,
): Promise<void> {
  for (const unsub of connection.unsubscribes) {
    await unsub();
  }
  const userConnections = connections.get(userId);
  if (userConnections) {
    userConnections.delete(connection);
    if (userConnections.size === 0) {
      connections.delete(userId);
    }
  }
}

export async function sendToUser(
  userId: string,
  message: SSEMessage,
): Promise<void> {
  const { publish } = await import("@/lib/redis/pubsub");
  await publish(CHANNELS.notifications(userId), {
    event: message.event,
    data: message.data,
    id: message.id,
  });
}
