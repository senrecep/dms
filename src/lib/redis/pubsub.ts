import Redis from "ioredis";

const globalForSubscriber = globalThis as unknown as {
  redisSubscriber: Redis | undefined;
};

function createSubscriber() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  const subscriber = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 200, 5000);
    },
  });

  subscriber.on("error", (err) => {
    console.error("[Redis PubSub] Subscriber error:", err.message);
  });

  subscriber.on("message", (channel: string, message: string) => {
    const channelHandlers = handlers.get(channel);
    if (channelHandlers) {
      for (const handler of channelHandlers) {
        handler(message, channel);
      }
    }
  });

  return subscriber;
}

function getSubscriber(): Redis {
  if (!globalForSubscriber.redisSubscriber) {
    globalForSubscriber.redisSubscriber = createSubscriber();
  }
  return globalForSubscriber.redisSubscriber;
}

// Channels
export const CHANNELS = {
  notifications: (userId: string) => `notifications:${userId}`,
  documents: (documentId: string) => `documents:${documentId}`,
  approvals: "approvals",
} as const;

type MessageHandler = (message: string, channel: string) => void;

const handlers = new Map<string, Set<MessageHandler>>();

export async function publish(
  channel: string,
  data: unknown,
): Promise<void> {
  const { getRedis } = await import("./index");
  await getRedis().publish(channel, JSON.stringify(data));
}

export async function subscribe(
  channel: string,
  handler: MessageHandler,
): Promise<() => Promise<void>> {
  const subscriber = getSubscriber();
  if (!handlers.has(channel)) {
    handlers.set(channel, new Set());
    await subscriber.subscribe(channel);
  }
  handlers.get(channel)!.add(handler);

  return async () => {
    const channelHandlers = handlers.get(channel);
    if (channelHandlers) {
      channelHandlers.delete(handler);
      if (channelHandlers.size === 0) {
        handlers.delete(channel);
        await subscriber.unsubscribe(channel);
      }
    }
  };
}
