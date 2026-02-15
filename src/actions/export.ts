"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  documents,
  documentRevisions,
  departments,
  users,
  distributionLists,
} from "@/lib/db/schema";
import { and, eq, or, ilike, inArray, desc, sql } from "drizzle-orm";
import { headers } from "next/headers";
import * as XLSX from "xlsx";

import type { DocumentFilters } from "./documents";

export async function exportDocumentsToExcel(filters: DocumentFilters = {}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const { search, departmentId, documentType, status } = filters;

  const rev = documentRevisions;
  const conditions = [eq(documents.isDeleted, false)];

  if (search) {
    conditions.push(
      or(
        ilike(rev.title, `%${search}%`),
        ilike(documents.documentCode, `%${search}%`),
      )!,
    );
  }

  if (documentType) {
    conditions.push(eq(rev.documentType, documentType as "PROCEDURE" | "INSTRUCTION" | "FORM"));
  }

  if (status) {
    conditions.push(
      eq(
        rev.status,
        status as "DRAFT" | "PENDING_APPROVAL" | "PREPARER_APPROVED" | "PREPARER_REJECTED" | "APPROVED" | "APPROVER_REJECTED" | "PUBLISHED" | "CANCELLED",
      ),
    );
  }

  if (departmentId) {
    const distributedRevisionDocIds = db
      .select({ documentId: rev.documentId })
      .from(distributionLists)
      .innerJoin(rev, eq(distributionLists.revisionId, rev.id))
      .where(eq(distributionLists.departmentId, departmentId));

    conditions.push(
      or(
        eq(rev.departmentId, departmentId),
        inArray(documents.id, distributedRevisionDocIds),
      )!,
    );
  }

  const rows = await db
    .select({
      documentCode: documents.documentCode,
      title: rev.title,
      documentType: rev.documentType,
      status: rev.status,
      currentRevisionNo: documents.currentRevisionNo,
      publishedAt: rev.publishedAt,
      createdAt: documents.createdAt,
      departmentName: departments.name,
      preparerName: sql<string>`preparer.name`.as("preparer_name"),
      approverName: sql<string>`approver_user.name`.as("approver_name"),
    })
    .from(documents)
    .innerJoin(rev, eq(documents.currentRevisionId, rev.id))
    .leftJoin(departments, eq(rev.departmentId, departments.id))
    .leftJoin(
      sql`"user" as preparer`,
      sql`preparer.id = ${rev.preparerId}`,
    )
    .leftJoin(
      sql`"user" as approver_user`,
      sql`approver_user.id = ${rev.approverId}`,
    )
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt));

  const wsData = rows.map((row) => ({
    "Document Code": row.documentCode,
    Title: row.title,
    Type: row.documentType,
    Department: row.departmentName ?? "",
    Preparer: row.preparerName ?? "",
    Approver: row.approverName ?? "",
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
