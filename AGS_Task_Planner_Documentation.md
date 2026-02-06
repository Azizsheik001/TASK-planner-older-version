# AGS Task Planner: Detailed Documentation

This document explains the internal workings, architecture, and core features of the AGS Task Planner.

## 1. System Architecture

The AGS Task Planner is built using a modern full-stack architecture:

*   **Frontend**: Built with **React.js**. It uses **React Router** for navigation and **Context API** for global user state management.
*   **Backend & Database**: Powered by **Supabase**. This provides a PostgreSQL database, real-time data synchronization, and cloud storage for attachments.
*   **Real-time Integration**: The application uses Supabase's Realtime channels to reflect database changes (inserts, updates, deletes) instantly in the UI without page refreshes.

## 2. Core Components & Workings

### Dashboard
The Dashboard serves as the central hub for users to get an immediate overview of their workload.
*   **Statistics Cards**: Displays total, todo, in progress, completed, and overdue tasks.
*   **Data Visualization**: Uses `recharts` to render Bar charts (task status distribution) and Pie charts (team-specific progress distribution).
*   **Upcoming Todo's**: Filters and displays tasks due "Today" or "This Week".
*   **Team Overview**: Displays team cards with member counts, allowing admins to filter dashboard data by team.

### Task Board (Task List)
The Task Board provides a comprehensive view of all system tasks with advanced filtering capabilities.
*   **Kanban Sections**: Tasks are grouped into "To Do", "In Progress", and "Completed" (collapsible) sections.
*   **Modern Table View**: Detailed task information including Assignee, Assigned By, Dates, Budget, and Priority.
*   **Filtering**: Users can filter tasks by Scope (All, Team, or My Tasks), Status, and search keywords.

### Calendar View
Displays tasks on a monthly calendar interface, allowing users to visualize deadlines and timelines. Clicking a task opens the detail modal for quick edits.

## 3. Task Lifecycle Management

### Task Creation & Attributes
Tasks are the core unit of work. Key attributes include:
*   **Title & Description**: Detailed requirements.
*   **Assignee & Email**: The person responsible for the work.
*   **Priority**: Categorized as Low, Medium, or High.
*   **Status**: Tracks progress (Todo -> In Progress -> Completed).
*   **Budget**: Financial allocation for the task.
*   **Attachments**: Support for multiple file uploads stored in Supabase Storage.

### Timeline & Extensions
*   **Incremental Due Dates**: Tasks support a primary due date and up to two extended due dates for tracking timeline shifts.
*   **Validation**: Extended dates are validated to ensure they are later than the original due date.

### Time Tracking
*   **Automatic Timer**: When a task's status is changed to "In Progress", a timer starts automatically.
*   **Manual Logging**: Users can also manually adjust the "Hours" field.
*   **Persistent Clock**: The UI displays a live running clock in the task form while a task is in progress.

### Progress Reporting
*   **Progress Status**: Visual indicators for "In progress" (green) or "Trouble" (red).
*   **Progress Report**: A dedicated field for users to provide written updates on their current status.

## 4. Role-Based Access Control (RBAC)

The system enforces visibility and editing privileges based on user roles:

| Role | Permissions |
| :--- | :--- |
| **Global Admin** | Can view/edit/delete any task, manage teams, and access full dashboard stats. |
| **Department Admin** | Can manage tasks and members within their specific department/team. |
| **User** | Primarily views and updates tasks assigned to them. Limited creation/editing rights depending on configuration. |

## 5. Data Flow & Synchronization

1.  **Action**: User performs an action (e.g., updates a task status).
2.  **Optimistic UI**: The React state updates immediately for a snappy feel.
3.  **Persistence**: The update is sent to Supabase via the `supabaseClient`.
4.  **Real-time Broadcast**: Supabase broadcasts the change to all connected clients.
5.  **Global Update**: All active dashboards and lists update automatically via the Realtime listener in `App.js`.

---
*Note: This documentation covers the general operational flow and excludes sub-team and specialized administrative configurations.*
