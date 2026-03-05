import { relations } from "drizzle-orm";
import { users } from "./users";
import { departments } from "./departments";
import { documents } from "./documents";
import {
  carSources,
  carSystems,
  carProcesses,
  carCustomers,
  carProducts,
  carOperations,
} from "./car-lookups";
import { correctiveActionRequests } from "./corrective-action-requests";
import { carRootCauseAnalyses } from "./car-root-cause";
import { carImmediateActions } from "./car-immediate-actions";
import { carCorrectiveActions } from "./car-corrective-actions";
import { carActionTeam } from "./car-action-team";
import { carAttachments } from "./car-attachments";
import { carNotificationUsers } from "./car-notification-users";
import { carActivityLogs } from "./car-activity-logs";
import { userPermissions } from "./user-permissions";

export const carSourcesRelations = relations(carSources, ({ many }) => ({
  correctiveActionRequests: many(correctiveActionRequests),
}));

export const carSystemsRelations = relations(carSystems, ({ many }) => ({
  correctiveActionRequests: many(correctiveActionRequests),
}));

export const carProcessesRelations = relations(carProcesses, ({ many }) => ({
  correctiveActionRequests: many(correctiveActionRequests),
}));

export const carCustomersRelations = relations(carCustomers, ({ many }) => ({
  correctiveActionRequests: many(correctiveActionRequests),
}));

export const carProductsRelations = relations(carProducts, ({ many }) => ({
  correctiveActionRequests: many(correctiveActionRequests),
}));

export const carOperationsRelations = relations(carOperations, ({ many }) => ({
  correctiveActionRequests: many(correctiveActionRequests),
}));

export const correctiveActionRequestsRelations = relations(
  correctiveActionRequests,
  ({ one, many }) => ({
    source: one(carSources, {
      fields: [correctiveActionRequests.sourceId],
      references: [carSources.id],
    }),
    system: one(carSystems, {
      fields: [correctiveActionRequests.systemId],
      references: [carSystems.id],
    }),
    process: one(carProcesses, {
      fields: [correctiveActionRequests.processId],
      references: [carProcesses.id],
    }),
    customer: one(carCustomers, {
      fields: [correctiveActionRequests.customerId],
      references: [carCustomers.id],
    }),
    product: one(carProducts, {
      fields: [correctiveActionRequests.productId],
      references: [carProducts.id],
    }),
    operation: one(carOperations, {
      fields: [correctiveActionRequests.operationId],
      references: [carOperations.id],
    }),
    requester: one(users, {
      fields: [correctiveActionRequests.requesterId],
      references: [users.id],
      relationName: "carRequester",
    }),
    requesterDepartment: one(departments, {
      fields: [correctiveActionRequests.requesterDepartmentId],
      references: [departments.id],
      relationName: "carRequesterDepartment",
    }),
    responsibleDepartment: one(departments, {
      fields: [correctiveActionRequests.responsibleDepartmentId],
      references: [departments.id],
      relationName: "carResponsibleDepartment",
    }),
    assignee: one(users, {
      fields: [correctiveActionRequests.assigneeId],
      references: [users.id],
      relationName: "carAssignee",
    }),
    closedBy: one(users, {
      fields: [correctiveActionRequests.closedById],
      references: [users.id],
      relationName: "carClosedBy",
    }),
    dmsDocument: one(documents, {
      fields: [correctiveActionRequests.dmsDocumentId],
      references: [documents.id],
    }),
    rootCauseAnalyses: many(carRootCauseAnalyses),
    immediateActions: many(carImmediateActions),
    correctiveActions: many(carCorrectiveActions),
    attachments: many(carAttachments),
    notificationUsers: many(carNotificationUsers),
    activityLogs: many(carActivityLogs),
  }),
);

export const carRootCauseAnalysesRelations = relations(
  carRootCauseAnalyses,
  ({ one }) => ({
    car: one(correctiveActionRequests, {
      fields: [carRootCauseAnalyses.carId],
      references: [correctiveActionRequests.id],
    }),
    createdBy: one(users, {
      fields: [carRootCauseAnalyses.createdById],
      references: [users.id],
      relationName: "carRootCauseCreatedBy",
    }),
  }),
);

export const carImmediateActionsRelations = relations(
  carImmediateActions,
  ({ one }) => ({
    car: one(correctiveActionRequests, {
      fields: [carImmediateActions.carId],
      references: [correctiveActionRequests.id],
    }),
    createdBy: one(users, {
      fields: [carImmediateActions.createdById],
      references: [users.id],
      relationName: "carImmediateActionCreatedBy",
    }),
  }),
);

export const carCorrectiveActionsRelations = relations(
  carCorrectiveActions,
  ({ one, many }) => ({
    car: one(correctiveActionRequests, {
      fields: [carCorrectiveActions.carId],
      references: [correctiveActionRequests.id],
    }),
    owner: one(users, {
      fields: [carCorrectiveActions.ownerId],
      references: [users.id],
      relationName: "carCorrectiveActionOwner",
    }),
    createdBy: one(users, {
      fields: [carCorrectiveActions.createdById],
      references: [users.id],
      relationName: "carCorrectiveActionCreatedBy",
    }),
    team: many(carActionTeam),
    attachments: many(carAttachments),
  }),
);

export const carActionTeamRelations = relations(
  carActionTeam,
  ({ one }) => ({
    correctiveAction: one(carCorrectiveActions, {
      fields: [carActionTeam.correctiveActionId],
      references: [carCorrectiveActions.id],
    }),
    user: one(users, {
      fields: [carActionTeam.userId],
      references: [users.id],
      relationName: "carActionTeamUser",
    }),
  }),
);

export const carAttachmentsRelations = relations(
  carAttachments,
  ({ one }) => ({
    car: one(correctiveActionRequests, {
      fields: [carAttachments.carId],
      references: [correctiveActionRequests.id],
    }),
    correctiveAction: one(carCorrectiveActions, {
      fields: [carAttachments.correctiveActionId],
      references: [carCorrectiveActions.id],
    }),
    uploadedBy: one(users, {
      fields: [carAttachments.uploadedById],
      references: [users.id],
      relationName: "carAttachmentUploadedBy",
    }),
  }),
);

export const carNotificationUsersRelations = relations(
  carNotificationUsers,
  ({ one }) => ({
    car: one(correctiveActionRequests, {
      fields: [carNotificationUsers.carId],
      references: [correctiveActionRequests.id],
    }),
    user: one(users, {
      fields: [carNotificationUsers.userId],
      references: [users.id],
      relationName: "carNotificationUser",
    }),
  }),
);

export const carActivityLogsRelations = relations(
  carActivityLogs,
  ({ one }) => ({
    car: one(correctiveActionRequests, {
      fields: [carActivityLogs.carId],
      references: [correctiveActionRequests.id],
    }),
    correctiveAction: one(carCorrectiveActions, {
      fields: [carActivityLogs.correctiveActionId],
      references: [carCorrectiveActions.id],
    }),
    user: one(users, {
      fields: [carActivityLogs.userId],
      references: [users.id],
      relationName: "carActivityLogUser",
    }),
  }),
);

export const userPermissionsRelations = relations(
  userPermissions,
  ({ one }) => ({
    user: one(users, {
      fields: [userPermissions.userId],
      references: [users.id],
      relationName: "userPermissions",
    }),
    grantedBy: one(users, {
      fields: [userPermissions.grantedById],
      references: [users.id],
      relationName: "grantedPermissions",
    }),
  }),
);
