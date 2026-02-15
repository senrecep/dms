import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runApprovalReminders } from "@/lib/jobs/approval-reminder";
import { runApprovalEscalations } from "@/lib/jobs/approval-escalation";
import { runReadReminders } from "@/lib/jobs/read-reminder";

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      console.error("[Cron] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting cron jobs...");
    const startTime = Date.now();

    // Run all jobs in parallel
    const [approvalReminders, approvalEscalations, readReminders] =
      await Promise.allSettled([
        runApprovalReminders(),
        runApprovalEscalations(),
        runReadReminders(),
      ]);

    const duration = Date.now() - startTime;

    // Collect results
    const results = {
      duration: `${duration}ms`,
      approvalReminders:
        approvalReminders.status === "fulfilled"
          ? approvalReminders.value
          : { error: approvalReminders.reason?.message || "Unknown error" },
      approvalEscalations:
        approvalEscalations.status === "fulfilled"
          ? approvalEscalations.value
          : { error: approvalEscalations.reason?.message || "Unknown error" },
      readReminders:
        readReminders.status === "fulfilled"
          ? readReminders.value
          : { error: readReminders.reason?.message || "Unknown error" },
    };

    console.log("[Cron] All jobs completed:", results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("[Cron] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
