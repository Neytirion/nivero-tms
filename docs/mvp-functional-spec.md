# Internal PM Tool - Functional Specification (MVP)

## Purpose
Provide a simple and effective internal project management platform for a tech consultancy, designed for future expansion and integrations.

## Design Principles
- Simple and intuitive user experience.
- Fast adoption by consultants and project managers.
- Modular architecture for future expansion.
- API-first approach for integrations.
- Role-based access control.
- Cloud-ready and scalable.

## Core Modules
- Projects
- Estimation and Work Packages
- Tasks and Kanban
- Time Tracking
- Resource Planning
- Project Health Dashboard
- Comments and Collaboration
- Documents

## Project Management
Projects contain:
- Customer
- Project manager
- Team members
- Status
- Start and end dates
- Estimated hours
- Actual hours
- Progress
- Documents

## Estimation Module
Before project start, project managers create estimates using work packages.

Requirements:
- Estimate versioning
- Approval flow
- Approved estimates visible to all project members when project starts

Sample work packages:

| Work Package | Estimated Hours |
| --- | ---: |
| Discovery | 20 |
| UX Design | 40 |
| Backend Development | 120 |
| Frontend Development | 80 |
| Testing | 30 |
| Deployment | 10 |

## Tasks and Delivery
- Kanban board columns: Backlog, To Do, In Progress, Review, Done.
- Task assignments.
- Priorities and due dates.
- Estimated vs actual hours per task.
- Task dependencies.
- List, Board, and Calendar views.

## Time Tracking
- Manual time entry.
- Timer-based tracking.
- Billable and non-billable time classification.
- Hours linked to tasks and projects.
- Weekly timesheet overview.

## Resource Planning
Managers can view consultant allocation and availability across projects to avoid overbooking.

## Project Health Dashboard
- Progress percentage.
- Estimated vs actual hours.
- Forecast completion.
- Risk indicators (Green, Yellow, Red).
- Budget consumption tracking.

## Collaboration
- Project comments.
- @mentions.
- Activity feed.
- File attachments.
- Project documentation/wiki.

## User Dashboards
Consultant dashboard:
- My tasks
- Due dates
- Logged hours
- Assigned projects

Project manager dashboard:
- Project status
- Risks
- Team capacity
- Estimate vs actual

## Future Expansion Roadmap
- CRM integration
- Invoicing and finance
- Client portal
- AI project assistant
- Automated status reports
- Knowledge management
- Advanced forecasting
- ERP integration
- Microsoft Teams integration
- GitHub/GitLab integration

## Suggested Technical Architecture
- Modular service architecture.
- REST or GraphQL APIs.
- Authentication and role-based permissions.
- Event-driven integration layer.
- Audit logging.
- Webhook support.
- Export/import capabilities.