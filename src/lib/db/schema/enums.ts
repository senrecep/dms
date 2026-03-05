import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "MANAGER",
  "USER",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "DRAFT",
  "PENDING_APPROVAL",
  "PREPARER_APPROVED",
  "PREPARER_REJECTED",
  "APPROVED",
  "APPROVER_REJECTED",
  "PUBLISHED",
  "CANCELLED",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const departmentMemberRoleEnum = pgEnum("department_member_role", [
  "MEMBER",
  "MANAGER",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "PROCEDURE",
  "INSTRUCTION",
  "FORM",
]);

export const carStatusEnum = pgEnum("car_status", [
  "OPEN",
  "ROOT_CAUSE_ANALYSIS",
  "IMMEDIATE_ACTION",
  "PLANNED_ACTION",
  "ACTION_RESULTS",
  "PENDING_CLOSURE",
  "CLOSED",
  "CANCELLED",
]);

export const carActionStatusEnum = pgEnum("car_action_status", [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const carAttachmentSectionEnum = pgEnum("car_attachment_section", [
  "REQUEST",
  "ROOT_CAUSE",
  "IMMEDIATE_ACTION",
  "CORRECTIVE_ACTION",
  "CLOSURE",
]);
