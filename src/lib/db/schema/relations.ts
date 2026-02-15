import { relations } from "drizzle-orm";
import { users } from "./users";
import { departments } from "./departments";
import { documents } from "./documents";
import { documentRevisions } from "./document-revisions";
import { approvals } from "./approvals";
import { distributionLists } from "./distribution-lists";
import { distributionUsers } from "./distribution-users";
import { readConfirmations } from "./read-confirmations";
import { notifications } from "./notifications";
import { activityLogs } from "./activity-logs";
import { systemSettings } from "./system-settings";

// Users relations
export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  uploadedDocuments: many(documents, { relationName: "uploadedBy" }),
  approvedDocuments: many(documents, { relationName: "approver" }),
  documentRevisions: many(documentRevisions),
  approvals: many(approvals),
  readConfirmations: many(readConfirmations),
  notifications: many(notifications),
  activityLogs: many(activityLogs),
  updatedSettings: many(systemSettings),
  distributionUsers: many(distributionUsers),
}));

// Departments relations
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  manager: one(users, {
    fields: [departments.managerId],
    references: [users.id],
  }),
  members: many(users),
  documents: many(documents, { relationName: "department" }),
  preparerDocuments: many(documents, { relationName: "preparerDepartment" }),
  distributionLists: many(distributionLists),
}));

// Documents relations
export const documentsRelations = relations(documents, ({ one, many }) => ({
  department: one(departments, {
    fields: [documents.departmentId],
    references: [departments.id],
    relationName: "department",
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedById],
    references: [users.id],
    relationName: "uploadedBy",
  }),
  preparerDepartment: one(departments, {
    fields: [documents.preparerDepartmentId],
    references: [departments.id],
    relationName: "preparerDepartment",
  }),
  approver: one(users, {
    fields: [documents.approverId],
    references: [users.id],
    relationName: "approver",
  }),
  revisions: many(documentRevisions),
  approvals: many(approvals),
  distributionLists: many(distributionLists),
  distributionUsers: many(distributionUsers),
  readConfirmations: many(readConfirmations),
  notifications: many(notifications),
  activityLogs: many(activityLogs),
}));

// Document Revisions relations
export const documentRevisionsRelations = relations(
  documentRevisions,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentRevisions.documentId],
      references: [documents.id],
    }),
    createdBy: one(users, {
      fields: [documentRevisions.createdById],
      references: [users.id],
    }),
  }),
);

// Approvals relations
export const approvalsRelations = relations(approvals, ({ one }) => ({
  document: one(documents, {
    fields: [approvals.documentId],
    references: [documents.id],
  }),
  approver: one(users, {
    fields: [approvals.approverId],
    references: [users.id],
  }),
}));

// Distribution Lists relations
export const distributionListsRelations = relations(
  distributionLists,
  ({ one }) => ({
    document: one(documents, {
      fields: [distributionLists.documentId],
      references: [documents.id],
    }),
    department: one(departments, {
      fields: [distributionLists.departmentId],
      references: [departments.id],
    }),
  }),
);

// Distribution Users relations
export const distributionUsersRelations = relations(
  distributionUsers,
  ({ one }) => ({
    document: one(documents, {
      fields: [distributionUsers.documentId],
      references: [documents.id],
    }),
    user: one(users, {
      fields: [distributionUsers.userId],
      references: [users.id],
    }),
  }),
);

// Read Confirmations relations
export const readConfirmationsRelations = relations(
  readConfirmations,
  ({ one }) => ({
    document: one(documents, {
      fields: [readConfirmations.documentId],
      references: [documents.id],
    }),
    user: one(users, {
      fields: [readConfirmations.userId],
      references: [users.id],
    }),
  }),
);

// Notifications relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  relatedDocument: one(documents, {
    fields: [notifications.relatedDocumentId],
    references: [documents.id],
  }),
}));

// Activity Logs relations
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  document: one(documents, {
    fields: [activityLogs.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// System Settings relations
export const systemSettingsRelations = relations(
  systemSettings,
  ({ one }) => ({
    updatedBy: one(users, {
      fields: [systemSettings.updatedById],
      references: [users.id],
    }),
  }),
);
