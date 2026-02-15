"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, departments, users } from "@/lib/db/schema";
import { and, eq, or, ilike, inArray, desc } from "drizzle-orm";
import { distributionLists } from "@/lib/db/schema";
import { headers } from "next/headers";
import * as XLSX from "xlsx";

import type { DocumentFilters } from "./documents";

export async function exportDocumentsToExcel(filters: DocumentFilters = {}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const { search, departmentId, documentType, status } = filters;

  const conditions = [eq(documents.isDeleted, false)];

  if (search) {
    conditions.push(
      or(
        ilike(documents.title, `%${search}%`),
        ilike(documents.documentCode, `%${search}%`),
      )!,
    );
  }

  if (documentType) {
    conditions.push(eq(documents.documentType, documentType as "PROCEDURE" | "INSTRUCTION" | "FORM"));
  }

  if (status) {
    conditions.push(
      eq(
        documents.status,
        status as "DRAFT" | "PENDING_APPROVAL" | "INTERMEDIATE_APPROVAL" | "APPROVED" | "PUBLISHED" | "REVISION" | "PASSIVE" | "CANCELLED",
      ),
    );
  }

  if (departmentId) {
    const distributedDocIds = db
      .select({ documentId: distributionLists.documentId })
      .from(distributionLists)
      .where(eq(distributionLists.departmentId, departmentId));

    conditions.push(
      or(
        eq(documents.departmentId, departmentId),
        inArray(documents.id, distributedDocIds),
      )!,
    );
  }

  const rows = await db
    .select({
      documentCode: documents.documentCode,
      title: documents.title,
      documentType: documents.documentType,
      status: documents.status,
      currentRevisionNo: documents.currentRevisionNo,
      publishedAt: documents.publishedAt,
      createdAt: documents.createdAt,
      departmentName: departments.name,
      uploaderName: users.name,
    })
    .from(documents)
    .leftJoin(departments, eq(documents.departmentId, departments.id))
    .leftJoin(users, eq(documents.uploadedById, users.id))
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt));

  const wsData = rows.map((row) => ({
    "Document Code": row.documentCode,
    Title: row.title,
    Type: row.documentType,
    Department: row.departmentName ?? "",
    "Uploaded By": row.uploaderName ?? "",
    Status: row.status,
    "Revision No": row.currentRevisionNo,
    "Published At": row.publishedAt?.toISOString() ?? "",
    "Created At": row.createdAt.toISOString(),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "Documents");

  const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  return { base64: buffer as string, fileName: "documents-export.xlsx" };
}
