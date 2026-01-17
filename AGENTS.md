# AI Agent Context & Guidelines

## 1. Project Overview
* **Name:** Dhuud Gatekeeper
* **Purpose:** HSSE (Health, Safety, Security, Environment) management system with offline capabilities.
* **Core Features:** Gate passes, incident reporting, asset management, and offline synchronization.

## 2. Tech Stack
* **Frontend:** React (Vite), TypeScript 5.x
* **Styling:** Tailwind CSS, Shadcn UI (components/ui)
* **Backend:** Supabase (PostgreSQL, Edge Functions)
* **State/Cache:** React Query (TanStack), Context API (for auth/session)
* **Offline:** Service Workers (PWA), Local Storage/IndexedDB for offline queue.
* **Testing:** Vitest

## 3. Architecture & Patterns
* **Supabase Integration:** All database interactions must go through `src/integrations/supabase/client.ts`. Use the generated types in `database.types.ts`.
* **Offline Strategy:** Critical features (Inspections, Incidents) must work offline. Mutations are queued in `src/lib/offline-mutation-queue.ts`. **Do not write direct fetch calls; use the offline hooks.**
* **Component Structure:**
    * `src/components/ui`: Reusable primitives (do not modify logic here).
    * `src/components/[feature]`: Feature-specific logic (e.g., `src/components/assets`).
* **Route Protection:** Use `ProtectedRoute.tsx` and Role-based gates (`RoleBasedActionGrid.tsx`).

## 4. Constraints (DO NOT DO)
* Do not use standard `fetch` for API calls; use the Supabase client.
* Do not modify `src/components/ui/*` unless styling is broken globally.
* Do not remove `console.log` from `src/lib/logger.ts` (preserve audit trails).
