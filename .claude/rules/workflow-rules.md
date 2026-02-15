# Document Workflow Rules

## Status Lifecycle
Draft → Pending Approval → Intermediate Approval → Approved → Published → Revision → Passive → Cancelled

## Approval Rules
- Documents require approval before publishing
- Approval levels: INTERMEDIATE (department manager) and FINAL (admin)
- Rejection requires a comment explaining the reason
- Rejected documents return to Draft status
- Approval timeout is admin-configurable with reminder and escalation

## Document Numbering
- Hybrid: system auto-suggests, user can edit
- Format must be unique (enforced by documentCode unique constraint)

## Distribution & Read Confirmation
- Published documents are distributed to departments via distribution_lists
- Users in distributed departments must confirm reading via read_confirmations
- Unconfirmed reads trigger reminder notifications

## Activity Logging
- Every mutation MUST log to activity_logs table
- Action types: CREATED, UPDATED, STATUS_CHANGED, APPROVED, REJECTED, DISTRIBUTED, DOWNLOADED
- Include JSONB details with before/after state where relevant

## Notifications
- Types: APPROVAL_REQUEST, DOCUMENT_REJECTED, READ_ASSIGNMENT, REMINDER, ESCALATION
- Delivery: in-app (SSE real-time) + email (Resend)
- Real-time via Redis Pub/Sub → SSE to connected clients
