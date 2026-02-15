import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "MANAGER",
  "USER",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "DRAFT",
  "PENDING_APPROVAL",
  "INTERMEDIATE_APPROVAL",
  "APPROVED",
  "PUBLISHED",
  "REVISION",
  "PASSIVE",
  "CANCELLED",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "PROCEDURE",
  "INSTRUCTION",
  "FORM",
]);
