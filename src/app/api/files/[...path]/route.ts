import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getFileStream, getMimeType } from "@/lib/storage";
import { resolveSecurePath } from "@/lib/storage/path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  // Authentication: require session cookie
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get("better-auth.session_token") ??
    cookieStore.get("__Secure-better-auth.session_token");

  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Reconstruct and validate path
  const { path: pathSegments } = await params;
  const requestedPath = pathSegments.join("/");

  // Validate path components: no ".." or absolute paths
  if (
    pathSegments.some(
      (segment) => segment === ".." || segment === "." || segment === "",
    )
  ) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Resolve secure path (prevents traversal)
  const resolvedPath = resolveSecurePath(requestedPath);
  if (!resolvedPath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Check file exists
  if (!existsSync(resolvedPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const fileStats = await stat(resolvedPath);
  if (!fileStats.isFile()) {
    return NextResponse.json({ error: "Not a file" }, { status: 400 });
  }

  const fileName = pathSegments[pathSegments.length - 1];
  const mimeType = getMimeType(fileName);
  const fileSize = fileStats.size;

  // Handle range requests for large files
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return new NextResponse("Invalid range", { status: 416 });
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      return new NextResponse("Range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const { createReadStream } = await import("node:fs");
    const { Readable } = await import("node:stream");
    const nodeStream = createReadStream(resolvedPath, { start, end });
    const stream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(stream, {
      status: 206,
      headers: {
        "Content-Type": mimeType,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": (end - start + 1).toString(),
        "Accept-Ranges": "bytes",
      },
    });
  }

  // Full file response
  const stream = getFileStream(resolvedPath);

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": fileSize.toString(),
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
