# CRM Dashboard Application

## Overview

This is a comprehensive CRM (Customer Relationship Management) dashboard application designed to manage content creators, content, client portals, and administrative functions. Its purpose is to provide a robust, scalable solution for managing content creators and their work, with a vision for enterprise-level scalability. Key capabilities include content creation and management, real-time communication, customizable creator portal features, and various administrative modules for client, team, calendar, reports, and invoice management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Shadcn/ui built on Radix UI
- **Styling**: Tailwind CSS with custom CSS variables
- **Build Tool**: Vite
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**: TikTok-style vertical scrolling content feed, customizable aesthetic templates for creator pages, professional loading states (skeleton loaders), optimistic UI updates, and consistent design patterns (e.g., standardized `PageHeader` component, hot pink accent color for public-facing elements).

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Session Management**: Express-session with PostgreSQL store
- **File Uploads**: Multer
- **Authentication**: Dual system (Replit Auth for employees, custom JWT-based authentication for creators).
- **Video Processing**: Transloadit integration for automatic MP4 conversion, thumbnail generation, and Mux streaming pipeline.

### Data Storage Solutions
- **Primary Database**: PostgreSQL (Neon serverless)
- **Session Storage**: PostgreSQL sessions table
- **File Storage**: Local file system (uploads directory), S3, and ImageKit for cloud storage.

### Core Architectural Patterns & Design Decisions
- **Modularity**: Separation of frontend and backend concerns.
- **Role-based Access Control**: Granular permissions for employees (employee, team_lead, manager, admin).
- **Real-Time Communication**: WebSocket integration for group chats with message broadcasting and live updates, utilizing a zero-cache architecture.
- **Mobile-First Design**: Creator portal optimized for mobile experiences.
- **Performance Optimization**: Designed for 400+ concurrent employees with virtual scrolling for large lists, intelligent database and API response caching, aggressive data prefetching (e.g., hover prefetching), skeleton loading, optimistic updates, progressive loading, gesture recognition, media prefetching, video/image optimization, CDN integration, web worker integration for CPU-intensive tasks, request batching, and connection type detection.
- **Security**: Comprehensive security enhancements including account lockout, session security, input validation, XSS prevention, and real-time security monitoring.
- **Deployment Optimization**: Strategies to reduce project size and memory usage through asset offloading and optimized build processes.
- **Hub Project Management (Fixed Jan 8, 2025)**: Complete project creation and retrieval system with PostgreSQL backend, supporting rich text descriptions, categories, dynamic sections, and task associations
- **Production Protection System**: Mandatory rollback and version lock policy for critical, finalized sections, requiring explicit user approval for any changes. Protected pages include:
  - **Client Onboarding (FULLY LOCKED)**: Complete page including all tabs (Active Onboardings, Onboarding Flows, My Tasks, Admin Panel), detail popup, Active Onboardings tab enhancements with statistics, search, and calendar, Start New Onboarding popup with comprehensive client fields, and Admin Panel with Active Onboarding Time tracking and Completed Onboardings analysis
  - **Notifications (FULLY LOCKED)**: Complete page with page-level tabs (Notifications, Admin Panel), filter tabs (Unread, Client Updates, Warning, All), Admin Panel as separate page tab with search, create, edit, delete, and view tracking functionality, and Create New Notification popup with image upload field (drag & drop, preview, supports PNG/JPG/JPEG/WEBP)
  - **Client Form (LOCKED - Search & Assign)**: Search functionality on Form Submissions tab (search by name, email, phone, or any form responses), search bar visibility even when no forms submitted, and assign button with client dropdown to link forms to specific clients
  - **Lead Management (LOCKED - Filter Dropdown)**: Filter dropdown on Pending tab with options for 7+/14+/30+ days since last contact and $100k+/month earnings filter, works seamlessly with search functionality
  - **Hub Project Management (LOCKED - Projects/Tasks Toggle & Button Visibility + Task View Modes + Projects Display)**: Toggle button functionality on /hub/project-management page allowing users to switch between Projects view (default) and Tasks view without navigation, includes comprehensive task filtering (status, assignment, priority), search, bulk actions, and reuses existing task components. Context-aware button visibility: New Project button only appears in Projects tab, New Task button only appears in Tasks tab. **Tasks tab view modes (LOCKED - Jan 8, 2025)**: Three display modes for Tasks tab - List View (table with checkboxes), Board View (Kanban columns by status), Calendar View (monthly calendar by due date) with toggle buttons in Tasks tab header. **Projects Display (LOCKED - Jan 8, 2025)**: Projects list view with project cards showing title, description, status badges, progress bars, due dates, assigned members, and task counts. Backend properly creates hub_projects and hub_tasks tables, fetches and transforms project data with tasks
  - **Client Basic Info Creator Display**: Creator-facing information display
  - **Client Passwords**: Password management interface
  - **Client Communications**: Including admin panel
- **Hub Section**: Comprehensive Hub dropdown under WORKING ON section with two subsections:
  - **Docs/Sheets (Enhanced Jan 8, 2025, New Button Update LOCKED Jan 8, 2025, Admin Panel LOCKED Jan 8, 2025)**: Complete file explorer-style organization system with three-panel layout (folder tree, main files view, preview panel), supporting multiple file types (docs, sheets, PDFs, videos, images, links, audio, archives), advanced organization tools (list/grid views, filters, tags, search), file permissions & assignments, New button dropdown with integrated Upload option (removed standalone Upload button), Google Doc/Sheet/Drive links, PDF/Image uploads, Video links, and New Folder creation, bulk operations, version history, favorites/starred items, and trash/recycle bin with restore capability. **Admin Panel (LOCKED Jan 8, 2025)**: Admin-only tab with three sections - File Management (cross-account file access with filters and bulk actions), Category Management (CRUD operations with 11 predefined categories and usage statistics), and Usage Analytics (comprehensive metrics, user activity tracking, download statistics with time range selectors). Non-admin users see only Documents view without Admin Panel tab. **Note (Jan 8, 2025)**: Dynamic folder title display partially implemented - folders are created correctly but title change on selection needs debugging
  - **Tasks/Projects**: Kanban and list view project tracking with team collaboration features, toggle between Projects view (default) and Tasks view

## External Dependencies

- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Replit Authentication**: OIDC provider for employee authentication.
- **Transloadit**: Video processing service.
- **Mux**: Video streaming service.
- **ImageKit**: Image CDN.
- **AWS S3**: Cloud storage for video assets.
- **Radix UI**: Headless UI components.
- **Shadcn/ui**: Component library.
- **React Query (TanStack Query)**: Server state management.
- **React Hook Form**: Form management.
- **Zod**: Schema validation.
- **Wouter**: Client-side routing.
- **Tailwind CSS**: Styling framework.
- **Vite**: Build tool.
- **Express.js**: Backend web framework.
- **Drizzle ORM**: PostgreSQL ORM.
- **Multer**: Node.js middleware for handling `multipart/form-data`.
- **Bcrypt.js**: Password hashing library.
- **jsonwebtoken**: JWT generation and verification.
- **ws**: WebSocket library for real-time communication.
- **react-icons/si**: Social media icons.
- **lucide-react**: General icons.
- **Sharp**: Image processing library.
- **heic-convert**: HEIC image conversion library.