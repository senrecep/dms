import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { addConnection, removeConnection } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();
  let connection: Awaited<ReturnType<typeof addConnection>> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ userId })}\n\n`,
        ),
      );

      connection = await addConnection(userId, controller, encoder);
    },
    async cancel() {
      if (connection) {
        await removeConnection(userId, connection);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
