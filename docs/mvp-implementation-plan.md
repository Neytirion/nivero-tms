# MVP Implementation Plan

## Current Baseline (already implemented)
- Authentication (sign in/sign up).
- Profile page with avatar upload.
- Projects CRUD with member invites.
- Tasks Kanban board with drag-and-drop.
- Role checks for project management actions.

## Gap Analysis vs Target MVP

### 1) Projects module
Status: partial
- Missing customer data and richer project metadata.
- Missing progress, estimated hours, actual hours aggregation.

### 2) Estimation and work packages
Status: missing
- Work packages table and estimation versions are not implemented.
- Approval workflow is not implemented.

### 3) Tasks and delivery
Status: partial
- Board view exists.
- Missing Backlog and Review columns in data constraints and UX parity.
- Missing assignments, dependencies, and list/calendar modes.
- Missing estimated vs actual task hours.

### 4) Time tracking
Status: missing
- No manual time entry.
- No timer.
- No weekly timesheet view.

### 5) Resource planning
Status: missing
- No consultant allocation model.
- No capacity and availability views.

### 6) Project health dashboard
Status: missing
- No KPI calculations (forecast, risk, budget burn, planned vs actual).

### 7) Collaboration and documents
Status: partial
- Member management exists.
- Missing comments, mentions, activity feed, docs/wiki, file attachments by project.

## Recommended Delivery Phases

## Phase 1: Data Model Foundation
Goal: unblock all future modules through schema.

Add core tables/fields:
- `projects`: customer, start_date, end_date, estimated_hours, actual_hours, progress_percent, budget, risk_status.
- `tasks`: assignee, estimate_hours, actual_hours, dependency fields.
- `estimates`, `estimate_versions`, `work_packages`.
- `time_entries`.
- `project_comments`, `project_documents`, `activity_events`.

Add RLS:
- Role-aware policies for consultant, project manager, admin.
- Audit-friendly write policies.

Deliverables:
- SQL migrations
- Updated generated types

## Phase 2: Estimation and Work Packages
Goal: estimates before execution.

Features:
- Create estimate drafts from work package templates.
- Version estimates.
- Submit and approve estimate versions.
- Lock approved version for project visibility.

Deliverables:
- Estimation pages
- Service functions and hooks

## Phase 3: Tasks Expansion
Goal: complete delivery workflow.

Features:
- Board columns: Backlog, To Do, In Progress, Review, Done.
- Assignment picker.
- Dependency handling.
- List and calendar views.
- Estimated vs actual hours at task level.

Deliverables:
- Extended task UI components
- Filtering/sorting

## Phase 4: Time Tracking
Goal: track billable work reliably.

Features:
- Manual time entries.
- Timer start/stop flow.
- Billable/non-billable categories.
- Weekly timesheet and task/project links.

Deliverables:
- Time tracking pages and widgets
- Rollups to task/project actual hours

## Phase 5: Resource Planning + Health Dashboard
Goal: manager-level planning and control.

Features:
- Capacity and allocation board.
- Project health KPIs and risk colors.
- Forecast completion and budget burn.

Deliverables:
- Manager dashboard
- Aggregation queries/views

## Phase 6: Collaboration and Docs
Goal: team communication in context.

Features:
- Project comments with mentions.
- Activity feed.
- File attachments and docs/wiki.

Deliverables:
- Collaboration UI
- Notification events (later integrations)

## API-First and Integration Readiness
- Keep all business operations in `src/lib` and SQL RPC functions.
- Prefer stable DTOs for future REST/GraphQL extraction.
- Introduce event table/webhook emitter after Phase 3.

## Suggested Next Sprint (practical)
1. Extend schema for task estimate/actual and assignment.
2. Add Backlog/Review columns end-to-end.
3. Implement manual time entry UI + `time_entries` table.
4. Add project KPI card: estimated vs actual hours.
