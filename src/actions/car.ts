"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  correctiveActionRequests,
  carNotificationUsers,
  carAttachments,
  carActivityLogs,
  users,
  departments,
  departmentMembers,
  carSources,
  carSystems,
  carProcesses,
  carCustomers,
  carProducts,
  carOperations,
} from "@/lib/db/schema";
import { nanoid } from "nanoid";
import {
  and,
  eq,
  or,
  ilike,
  inArray,
  sql,
  desc,
  count,
  asc,
  ne,
  gte,
  lte,
} from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { enqueueNotification } from "@/lib/queue";
import { classifyError, type ActionResult } from "@/lib/errors";
import { saveFile } from "@/lib/storage";

// --- Types ---

export type CarFilters = {
  search?: string;
  status?: string[];
  sourceId?: string;
  requesterDepartmentId?: string;
  responsibleDepartmentId?: string;
  assigneeId?: string;
  dateFrom?: string;
  dateTo?: string;
  overdue?: boolean;
  page?: number;
  pageSize?: number;
};

export type CarListItem = {
  id: string;
  carCode: string;
  status: string;
  createdAt: Date;
  targetCompletionDate: Date;
  closingDate: Date | null;
  sourceName: string;
  requesterName: string;
  requesterDepartmentName: string;
  responsibleDepartmentName: string;
  assigneeName: string;
  closedByName: string | null;
  isOverdue: boolean;
};

// --- Helpers ---

function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

// --- suggestCarCode ---

export async function suggestCarCode(): Promise<string> {
  await getSession();
  const year = new Date().getFullYear();
  const prefix = `DF-${year}-`;

  const result = await db
    .select({ carCode: correctiveActionRequests.carCode })
    .from(correctiveActionRequests)
    .where(ilike(correctiveActionRequests.carCode, `${prefix}%`))
    .orderBy(desc(correctiveActionRequests.carCode))
    .limit(1);

  if (result.length === 0) {
    return `${prefix}1`;
  }

  const lastCode = result[0].carCode;
  const lastNum = parseInt(lastCode.replace(prefix, ""), 10);
  return `${prefix}${(lastNum || 0) + 1}`;
}

// --- createCar ---

const createCarSchema = z.object({
  carCode: z.string().min(1).max(50),
  sourceId: z.string().min(1),
  systemId: z.string().optional().nullable(),
  processId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  operationId: z.string().optional().nullable(),
  relatedStandard: z.string().optional().nullable(),
  nonconformityDescription: z.string().min(1).max(2000),
  assigneeId: z.string().min(1),
  requesterDepartmentId: z.string().min(1),
  responsibleDepartmentId: z.string().min(1),
  targetCompletionDate: z.string().min(1),
  notificationUserIds: z.array(z.string()).optional(),
});

export async function createCar(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSession();

    // Parse form fields
    const rawData = {
      carCode: formData.get("carCode") as string,
      sourceId: formData.get("sourceId") as string,
      systemId: (formData.get("systemId") as string) || null,
      processId: (formData.get("processId") as string) || null,
      customerId: (formData.get("customerId") as string) || null,
      productId: (formData.get("productId") as string) || null,
      operationId: (formData.get("operationId") as string) || null,
      relatedStandard: (formData.get("relatedStandard") as string) || null,
      nonconformityDescription: formData.get(
        "nonconformityDescription",
      ) as string,
      assigneeId: formData.get("assigneeId") as string,
      requesterDepartmentId: formData.get("requesterDepartmentId") as string,
      responsibleDepartmentId: formData.get(
        "responsibleDepartmentId",
      ) as string,
      targetCompletionDate: formData.get("targetCompletionDate") as string,
      notificationUserIds: formData.getAll("notificationUserIds") as string[],
    };

    const parsed = createCarSchema.parse(rawData);
    const carId = nanoid();

    // Insert CAR
    await db.insert(correctiveActionRequests).values({
      id: carId,
      carCode: parsed.carCode,
      status: "OPEN",
      sourceId: parsed.sourceId,
      systemId: parsed.systemId || null,
      processId: parsed.processId || null,
      customerId: parsed.customerId || null,
      productId: parsed.productId || null,
      operationId: parsed.operationId || null,
      relatedStandard: parsed.relatedStandard || null,
      nonconformityDescription: parsed.nonconformityDescription,
      requesterId: session.user.id,
      requesterDepartmentId: parsed.requesterDepartmentId,
      responsibleDepartmentId: parsed.responsibleDepartmentId,
      assigneeId: parsed.assigneeId,
      targetCompletionDate: new Date(parsed.targetCompletionDate),
    });

    // Insert notification users
    if (parsed.notificationUserIds && parsed.notificationUserIds.length > 0) {
      await db.insert(carNotificationUsers).values(
        parsed.notificationUserIds.map((userId) => ({
          id: nanoid(),
          carId,
          userId,
        })),
      );
    }

    // Handle file uploads
    const files = formData.getAll("attachments") as File[];
    for (const file of files) {
      if (file && file.size > 0) {
        const fileMeta = await saveFile(file, carId);
        await db.insert(carAttachments).values({
          id: nanoid(),
          carId,
          section: "REQUEST",
          filePath: fileMeta.path,
          fileName: fileMeta.fileName,
          fileSize: fileMeta.size,
          mimeType: fileMeta.mimeType,
          uploadedById: session.user.id,
        });
      }
    }

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId,
      userId: session.user.id,
      action: "CREATED",
      details: { carCode: parsed.carCode, status: "OPEN" },
    });

    // Notification to assignee - use REMINDER type as closest available
    await enqueueNotification({
      userId: parsed.assigneeId,
      type: "REMINDER",
      titleKey: "carAssigned",
      messageParams: { carCode: parsed.carCode },
    });

    revalidatePath("/car/list");
    return { success: true, id: carId };
  } catch (error) {
    return classifyError(error);
  }
}

// --- getCars (paginated list) ---

export async function getCars(filters: CarFilters = {}) {
  await getSession();
  const {
    search,
    status,
    sourceId,
    requesterDepartmentId,
    responsibleDepartmentId,
    assigneeId,
    dateFrom,
    dateTo,
    overdue,
    page = 1,
    pageSize = 20,
  } = filters;

  const conditions = [eq(correctiveActionRequests.isDeleted, false)];

  if (search) {
    const escaped = escapeLikePattern(search);
    conditions.push(
      or(
        ilike(correctiveActionRequests.carCode, `%${escaped}%`),
        ilike(
          correctiveActionRequests.nonconformityDescription,
          `%${escaped}%`,
        ),
      )!,
    );
  }

  if (status && status.length > 0) {
    conditions.push(
      inArray(
        correctiveActionRequests.status,
        status as ("CANCELLED" | "OPEN" | "ROOT_CAUSE_ANALYSIS" | "IMMEDIATE_ACTION" | "PLANNED_ACTION" | "ACTION_RESULTS" | "PENDING_CLOSURE" | "CLOSED")[],
      ),
    );
  }

  if (sourceId) {
    conditions.push(eq(correctiveActionRequests.sourceId, sourceId));
  }

  if (requesterDepartmentId) {
    conditions.push(
      eq(
        correctiveActionRequests.requesterDepartmentId,
        requesterDepartmentId,
      ),
    );
  }

  if (responsibleDepartmentId) {
    conditions.push(
      eq(
        correctiveActionRequests.responsibleDepartmentId,
        responsibleDepartmentId,
      ),
    );
  }

  if (assigneeId) {
    conditions.push(eq(correctiveActionRequests.assigneeId, assigneeId));
  }

  if (dateFrom) {
    conditions.push(
      gte(correctiveActionRequests.createdAt, new Date(dateFrom)),
    );
  }

  if (dateTo) {
    conditions.push(
      lte(correctiveActionRequests.createdAt, new Date(dateTo)),
    );
  }

  if (overdue) {
    conditions.push(
      lte(correctiveActionRequests.targetCompletionDate, new Date()),
    );
    conditions.push(ne(correctiveActionRequests.status, "CLOSED"));
    conditions.push(ne(correctiveActionRequests.status, "CANCELLED"));
  }

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(correctiveActionRequests)
    .where(and(...conditions));

  // Get paginated data with relations
  const offset = (page - 1) * pageSize;

  const data = await db.query.correctiveActionRequests.findMany({
    where: and(...conditions),
    with: {
      source: { columns: { name: true } },
      requester: { columns: { name: true } },
      assignee: { columns: { name: true } },
      requesterDepartment: { columns: { name: true } },
      responsibleDepartment: { columns: { name: true } },
      closedBy: { columns: { name: true } },
    },
    orderBy: [desc(correctiveActionRequests.createdAt)],
    limit: pageSize,
    offset,
  });

  const items: CarListItem[] = data.map((car) => ({
    id: car.id,
    carCode: car.carCode,
    status: car.status,
    createdAt: car.createdAt,
    targetCompletionDate: car.targetCompletionDate,
    closingDate: car.closingDate,
    sourceName: car.source?.name ?? "",
    requesterName: car.requester?.name ?? "",
    requesterDepartmentName: car.requesterDepartment?.name ?? "",
    responsibleDepartmentName: car.responsibleDepartment?.name ?? "",
    assigneeName: car.assignee?.name ?? "",
    closedByName: car.closedBy?.name ?? null,
    isOverdue:
      car.targetCompletionDate < new Date() &&
      car.status !== "CLOSED" &&
      car.status !== "CANCELLED",
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// --- getCarById ---

export async function getCarById(id: string) {
  await getSession();

  const car = await db.query.correctiveActionRequests.findFirst({
    where: and(
      eq(correctiveActionRequests.id, id),
      eq(correctiveActionRequests.isDeleted, false),
    ),
    with: {
      source: true,
      system: true,
      process: true,
      customer: true,
      product: true,
      operation: true,
      requester: { columns: { id: true, name: true, email: true, role: true } },
      assignee: { columns: { id: true, name: true, email: true, role: true } },
      requesterDepartment: { columns: { id: true, name: true } },
      responsibleDepartment: { columns: { id: true, name: true } },
      closedBy: { columns: { id: true, name: true, role: true } },
      rootCauseAnalyses: {
        with: { createdBy: { columns: { id: true, name: true } } },
        orderBy: (rca, { desc }) => [desc(rca.createdAt)],
      },
      immediateActions: {
        with: { createdBy: { columns: { id: true, name: true } } },
        orderBy: (ia, { desc }) => [desc(ia.createdAt)],
      },
      correctiveActions: {
        with: {
          owner: { columns: { id: true, name: true, role: true } },
          createdBy: { columns: { id: true, name: true } },
          team: {
            with: { user: { columns: { id: true, name: true, role: true } } },
          },
          attachments: true,
        },
        orderBy: (ca, { asc }) => [asc(ca.createdAt)],
      },
      attachments: {
        with: { uploadedBy: { columns: { id: true, name: true } } },
        orderBy: (att, { asc }) => [asc(att.createdAt)],
      },
      notificationUsers: {
        with: { user: { columns: { id: true, name: true, email: true, role: true } } },
      },
      activityLogs: {
        with: { user: { columns: { id: true, name: true } } },
        orderBy: (log, { desc }) => [desc(log.createdAt)],
        limit: 50,
      },
    },
  });

  return car;
}

// --- deleteCar (soft delete) ---

export async function deleteCar(id: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN") throw new Error("Forbidden");

    await db
      .update(correctiveActionRequests)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(correctiveActionRequests.id, id));

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId: id,
      userId: session.user.id,
      action: "DELETED",
    });

    revalidatePath("/car/list");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- Lookup data fetchers for form ---

export async function getCarLookups() {
  await getSession();

  const [
    sourcesData,
    systemsData,
    processesData,
    customersData,
    productsData,
    operationsData,
  ] = await Promise.all([
    db
      .select({ id: carSources.id, name: carSources.name })
      .from(carSources)
      .where(
        and(eq(carSources.isDeleted, false), eq(carSources.isActive, true)),
      )
      .orderBy(asc(carSources.sortOrder)),
    db
      .select({ id: carSystems.id, name: carSystems.name })
      .from(carSystems)
      .where(
        and(eq(carSystems.isDeleted, false), eq(carSystems.isActive, true)),
      )
      .orderBy(asc(carSystems.sortOrder)),
    db
      .select({ id: carProcesses.id, name: carProcesses.name })
      .from(carProcesses)
      .where(
        and(
          eq(carProcesses.isDeleted, false),
          eq(carProcesses.isActive, true),
        ),
      )
      .orderBy(asc(carProcesses.sortOrder)),
    db
      .select({ id: carCustomers.id, name: carCustomers.name })
      .from(carCustomers)
      .where(
        and(
          eq(carCustomers.isDeleted, false),
          eq(carCustomers.isActive, true),
        ),
      )
      .orderBy(asc(carCustomers.sortOrder)),
    db
      .select({ id: carProducts.id, name: carProducts.name })
      .from(carProducts)
      .where(
        and(
          eq(carProducts.isDeleted, false),
          eq(carProducts.isActive, true),
        ),
      )
      .orderBy(asc(carProducts.sortOrder)),
    db
      .select({ id: carOperations.id, name: carOperations.name })
      .from(carOperations)
      .where(
        and(
          eq(carOperations.isDeleted, false),
          eq(carOperations.isActive, true),
        ),
      )
      .orderBy(asc(carOperations.sortOrder)),
  ]);

  return {
    sources: sourcesData,
    systems: systemsData,
    processes: processesData,
    customers: customersData,
    products: productsData,
    operations: operationsData,
  };
}

export async function getCarFormUsers() {
  await getSession();

  const usersData = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(asc(users.name));

  const userIds = usersData.map((u) => u.id);
  const memberships =
    userIds.length > 0
      ? await db
          .select({
            userId: departmentMembers.userId,
            departmentName: departments.name,
          })
          .from(departmentMembers)
          .innerJoin(
            departments,
            eq(departmentMembers.departmentId, departments.id),
          )
          .where(inArray(departmentMembers.userId, userIds))
      : [];

  const deptMap = new Map<string, string[]>();
  for (const m of memberships) {
    const existing = deptMap.get(m.userId) || [];
    existing.push(m.departmentName);
    deptMap.set(m.userId, existing);
  }

  return usersData.map((u) => ({
    ...u,
    departmentName: deptMap.get(u.id)?.join(", ") ?? null,
  }));
}

export async function getCarFormDepartments() {
  await getSession();

  const departmentsData = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(
      and(eq(departments.isDeleted, false), eq(departments.isActive, true)),
    )
    .orderBy(asc(departments.name));

  return departmentsData;
}

export async function getUserDepartmentId(userId: string) {
  const userDept = await db
    .select({ departmentId: departmentMembers.departmentId })
    .from(departmentMembers)
    .where(eq(departmentMembers.userId, userId))
    .limit(1);

  return userDept[0]?.departmentId ?? null;
}
