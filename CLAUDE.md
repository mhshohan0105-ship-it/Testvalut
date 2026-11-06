# Build "TestVault": a TestRail style Test Management App

You are building a complete, production ready test management web app (similar to TestRail) from scratch. Work through the phases below in order. Before writing any code, save this whole brief into `CLAUDE.md` at the project root so you can refer back to it in every phase.

Three non negotiable goals:

1. Beautiful: a premium, modern UI with a real sense of depth and 3D, smooth motion, and polish everywhere.
2. Fast: the app must feel instant. Beauty must never cost speed.
3. Complete: every feature listed here must actually work end to end, not just look good.

## 1. Tech Stack (use exactly this)

* Framework: latest stable Next.js with App Router, TypeScript (strict mode)
* Styling: Tailwind CSS (latest), shadcn/ui components, Lucide icons
* Animation: Motion (the package formerly called Framer Motion, import from `motion/react`)
* 3D: React Three Fiber plus Drei, used ONLY in a few showcase places (see Section 3)
* Database: Neon Postgres, accessed with Prisma using the Neon serverless adapter
* File storage: Vercel Blob, using CLIENT UPLOADS (`upload()` in the browser and `handleUpload()` in a route handler) so files go straight from the browser to Blob and never hit the 4.5 MB function body limit
* Auth: Auth.js with email and password (Credentials provider, bcryptjs hashing, JWT sessions)
* Forms and validation: React Hook Form plus Zod (share Zod schemas between client and server)
* Charts: Recharts
* Lists: TanStack Virtual for long lists
* Command palette: cmdk
* Toasts: Sonner
* Deploy target: Vercel

Use Server Components by default. Use Server Actions for mutations. Only mark components `"use client"` when they truly need interactivity.

## 2. Design Direction

### Overall feel

A dark first, premium "command center" look. Think glass panels floating above a softly glowing deep space background. Every surface should feel layered, with clear depth between background, panels, cards, and popovers. Also provide a polished light mode with a toggle (remember choice).

### Color system (define as CSS variables / Tailwind theme tokens)

* Background: very deep navy (around `#0A0B1E`) with slow moving, blurred aurora gradient blobs in purple, indigo and a touch of cyan
* Primary: purple to indigo gradient (around `#7C3AED` to `#4F46E5`)
* Surfaces: translucent glass (white at 4 to 8 percent opacity, backdrop blur, 1px border at about 10 percent white, subtle inner highlight on the top edge)
* Status colors (used consistently everywhere, with matching soft glow):
   * Passed: emerald
   * Failed: rose
   * Blocked: amber
   * Retest: sky blue
   * Untested: slate gray
   * Skipped: violet gray

### Typography

* Use `next/font` to load Inter for UI text and JetBrains Mono for IDs, steps code and numbers
* Clear hierarchy: big bold page titles, muted secondary text, tabular numbers for stats

### The 3D and depth effects (how to achieve "3D" while staying fast)

Most of the 3D feel must come from cheap CSS, not WebGL:

* Tilt cards: project cards and stat cards gently tilt toward the cursor using CSS `perspective` and `rotateX/rotateY` driven by Motion values, with a moving light shine overlay. Max tilt about 8 degrees. Disabled on touch devices.
* Layered depth: multiple shadow layers plus a soft colored glow under important cards; cards lift slightly (translateZ / scale 1.02) on hover
* Glassmorphism: backdrop blur panels for sidebar, top bar, dialogs and dropdowns
* Parallax: aurora background blobs drift slowly and react very slightly to mouse movement
* 3D flip: the test result card flips when a status is set (front: case, back: result summary)
* Real WebGL 3D (React Three Fiber) ONLY in these places:
   1. Login / signup page: an elegant floating, slowly rotating abstract 3D object (glassy torus knot or icosahedron with transmission material and soft lighting) that follows the cursor a little
   2. Dashboard hero: a small 3D "progress orb" or ring whose fill reflects the overall pass rate
   3. Empty states (no projects, no runs): a small floating 3D shape

### Motion rules

* Spring based, quick and subtle (most transitions 150ms to 300ms)
* Page transitions: fade plus slight upward slide
* Lists: staggered entrance on first load only
* Numbers in stats animate (count up)
* Progress bars and charts animate in when they enter the viewport
* Status changes: small satisfying micro animation (check mark draw for Passed, gentle shake for Failed)
* Respect `prefers-reduced-motion`: turn off tilt, parallax, 3D and large animations, keep simple fades

### Layout

* Collapsible glass sidebar (icons only when collapsed) with: Dashboard, Projects, Test Cases, Test Runs, Milestones, Reports, Team, Settings
* Top bar: project switcher, global search button (opens command palette), theme toggle, user menu
* Fully responsive: works well on mobile (sidebar becomes a bottom sheet / drawer), tablet, and desktop
* Skeleton loaders shaped like the real content (never blank screens or plain spinners)

## 3. Performance Rules (MUST follow)

1. Lazy load all WebGL: every React Three Fiber scene is loaded with `next/dynamic` and `ssr: false`, shows a static CSS gradient placeholder first, and only mounts when visible.
2. Pause offscreen 3D: use `frameloop="demand"` or pause rendering when the canvas is not in view or the tab is hidden.
3. Cap device pixel ratio of canvases at 1.5. Keep geometry low poly. No heavy post processing.
4. Graceful fallback: if WebGL is unavailable, the device is weak, or reduced motion is on, show the static gradient version instead.
5. Animate only `transform` and `opacity`. Never animate width, height, top, left or box shadow directly (animate an overlay's opacity instead).
6. Server Components first; keep client bundles small. Target under about 200 KB gzipped JS on first load per route. Run a bundle analysis at the end and fix anything oversized.
7. Virtualize any list or table that can exceed 100 rows (test cases, run results).
8. Paginate on the server (cursor based) for cases, runs, results and activity.
9. Optimistic UI for setting test statuses, editing, reordering, so the UI updates instantly and syncs in the background, rolling back with a toast on error.
10. Database: add proper indexes (foreign keys, `projectId`, `runId`, `status`, `createdAt`). Select only needed fields. Avoid N plus 1 queries.
11. Images: use `next/image` for thumbnails; generate small previews; open full size only in the lightbox.
12. Debounce search inputs (about 250ms).
13. Prefetch links in the sidebar and lists.
14. Targets: Lighthouse Performance 90 or higher on desktop, LCP under 2.5s, no layout shift (CLS under 0.1), interactions feel under 100ms.

## 4. Data Model (Prisma)

Design the Prisma schema with these models (add sensible fields, timestamps, and indexes):

* User: id, name, email (unique), passwordHash, avatarUrl, role (ADMIN, LEAD, TESTER, VIEWER), createdAt
* Project: id, name, description, key (short code like "JM"), color, createdById, archived, createdAt
* ProjectMember: projectId, userId, role (per project role)
* Section: id, projectId, parentId (nullable, for nested folders), name, order
* TestCase: id, projectId, sectionId, caseNumber (auto increment per project, shown as "C123"), title, preconditions, priority (CRITICAL, HIGH, MEDIUM, LOW), type (FUNCTIONAL, REGRESSION, SMOKE, UI, API, PERFORMANCE, SECURITY, OTHER), estimate (minutes), references (text, e.g. Jira keys), tags, createdById, updatedById, order, timestamps
* TestStep: id, testCaseId, order, action, expectedResult
* TestCaseVersion: id, testCaseId, snapshot (JSON), changedById, createdAt (for history)
* Milestone: id, projectId, name, description, startDate, dueDate, completed
* TestRun: id, projectId, milestoneId (nullable), name, description, environment (free text like "Chrome / Staging"), assignedToId (default assignee), status (ACTIVE, COMPLETED), createdById, timestamps
* TestRunCase: id, runId, testCaseId, assignedToId, currentStatus (PASSED, FAILED, BLOCKED, RETEST, UNTESTED, SKIPPED), order. When a run is created, snapshot the selected cases into this table.
* TestResult: id, runCaseId, status, comment, actualResult, elapsedSeconds, defectRef (e.g. Jira key or URL), createdById, createdAt. Each new status creates a new result row (keeps full history).
* Attachment: id, url, pathname, fileName, mimeType, sizeBytes, uploadedById, plus nullable links to testCaseId, testResultId; createdAt
* Comment: id, testCaseId or runCaseId, authorId, body, createdAt
* ActivityLog: id, projectId, userId, action, entityType, entityId, meta (JSON), createdAt

Write a seed script that creates: one admin, two testers, two demo projects with nested sections, about 60 realistic test cases with steps (for an e-commerce site: login, cart, checkout, payment, profile), a milestone, and two runs with mixed results, so the app looks alive on first launch.

## 5. Features (build all of these)

### Auth and Team

* Sign up, log in, log out, protected routes (middleware)
* First registered user becomes ADMIN
* Admin can invite / add users, change roles, deactivate users
* Permissions enforced on the SERVER for every action (Viewer: read only; Tester: execute runs, add results, comment; Lead: manage cases, runs, milestones; Admin: everything)

### Dashboard

* Greeting, 3D progress orb (overall pass rate), stat cards (total cases, active runs, pass rate, open failures)
* "My assigned tests" list with quick links
* Recent activity feed
* Charts: results by status (donut), results over last 14 days (area chart), progress per active run (bars)

### Projects

* Grid of tilt cards with project color, key, case count, pass rate ring
* Create, edit, archive projects; manage members

### Test Case Repository

* Left: nested section tree (create, rename, delete, drag and drop to reorder and move)
* Right: virtualized case table with columns ID, title, priority, type, updated; sortable
* Filters: priority, type, tags, section, text search
* Bulk actions: move, delete, change priority, add to run
* Case editor (full page or large slide over panel):
   * Title, section, priority, type, estimate, references, tags
   * Preconditions (rich text with basic formatting)
   * Steps: add, remove, reorder (drag and drop) rows of Action and Expected Result
   * Attachments: drag and drop images and videos
   * Autosave draft indicator; Ctrl+S to save
* Case detail view with tabs: Details, History (version list with diff of changes), Results (all past results across runs), Comments
* Duplicate case; import cases from CSV (with column mapping preview); export cases to CSV

### Test Runs (the most important screen; make it a joy to use)

* Create run: name, milestone, environment, default assignee, then pick cases by checking sections or individual cases, or "include all", or filter by priority (e.g. all CRITICAL and HIGH for a smoke run)
* Run overview: big progress bar segmented by status colors, counts per status, filter by status and assignee
* Execution mode: focused full screen view showing one case at a time:
   * Steps listed clearly; each step can be marked pass or fail individually
   * Large status buttons with keyboard shortcuts: P Passed, F Failed, B Blocked, R Retest, S Skipped, J / K next / previous case
   * Comment, actual result, elapsed time (auto timer that starts when the case opens), defect reference field
   * Attach screenshots / videos, including paste from clipboard (Ctrl+V a screenshot directly)
   * After setting a status, auto advance to next untested case with a smooth slide animation
* Reassign cases; rerun failed only (creates a new run with only failed and blocked cases)
* Close run (locks it, read only)

### Attachments (Vercel Blob)

* Client upload flow: browser requests a token from `/api/upload`, the route checks the user is logged in and has permission, validates type and size, then the browser uploads directly to Blob
* Allowed: images (png, jpg, webp, gif) max 5 MB; videos (mp4, webm, mov) max 50 MB; also pdf and txt/log files max 10 MB
* Compress images in the browser before upload (resize to max 1920px, webp)
* Upload progress bar per file; cancel upload
* Gallery with thumbnails; lightbox for images; inline player for videos
* Deleting an attachment also deletes the Blob file
* Show total storage used in Settings (warn when nearing 1 GB, the free tier limit)

### Milestones

* List with due dates, progress (aggregated from linked runs), overdue highlight
* Milestone detail: linked runs and combined stats

### Reports

* Run summary report (status breakdown, failures list with comments and defects, per tester stats)
* Project report (pass rate trend over time, cases by priority, most failing cases)
* Date range filter; export as CSV; a clean print view (print to PDF)

### Global

* Command palette (Ctrl+K): jump to any project, case (by ID like "C123" or title), run, or action ("New test case", "New run")
* Keyboard shortcuts help dialog (press ?)
* Activity log per project
* Toast notifications for all actions
* Friendly empty states with 3D shape and a clear call to action
* Proper 404 and error pages in the same style
* Accessibility: keyboard navigable, visible focus rings, proper labels, good contrast in both themes

## 6. Code Quality Rules

* Clean folder structure: `app/`, `components/` (ui, layout, features), `lib/` (db, auth, validations, utils), `server/` (actions, queries)
* All server actions validate input with Zod and check permissions
* No `any` types; handle loading, empty and error states everywhere
* Reusable components for StatusBadge, PriorityBadge, GlassCard, TiltCard, StatCard, EmptyState, FileUploader
* Commit to git at the end of each phase with a clear message

## 7. Phases (do them in this order, and verify each before moving on)

* **Phase 1: Foundation.** Project setup, Tailwind theme tokens, fonts, dark/light mode, app shell (sidebar, top bar, aurora background), Prisma schema, Neon connection, seed script, Auth (signup, login, middleware, roles). Verify: app runs locally, can log in with seeded admin, theme toggle works, no console errors.
* **Phase 2: Projects and Test Case Repository.** Projects grid, sections tree, case table, case editor with steps, history, CSV import/export. Verify: create, edit, move, delete cases; data persists after refresh.
* **Phase 3: Test Runs and Execution.** Run creation, run overview, execution mode with shortcuts, results history, rerun failed. Verify: complete a full run using only the keyboard.
* **Phase 4: Attachments.** Vercel Blob client uploads, compression, paste from clipboard, gallery, lightbox, video player, deletion. Verify: upload a 30 MB video and a screenshot successfully.
* **Phase 5: Dashboard, Milestones, Reports.** Charts, stats, 3D progress orb, milestones, reports, CSV export, print view.
* **Phase 6: Polish and 3D.** Login page 3D scene, tilt cards, flip animation, empty states, command palette, shortcuts dialog, micro animations, reduced motion support, mobile layout pass.
* **Phase 7: Performance and Deploy.** Run `next build`, bundle analysis, Lighthouse check; fix anything below targets. Write a `README.md` with setup steps, environment variables, and deploy instructions. Prepare for Vercel deploy.

## 8. Environment Variables

Create `.env.example` with:

```
DATABASE_URL=
AUTH_SECRET=
BLOB_READ_WRITE_TOKEN=
NEXT_PUBLIC_APP_URL=
```

When you need real values, STOP and ask me to provide them. Never hardcode secrets.

## 9. Deploy Notes (put these in README)

1. Push the code to a GitHub repo
2. Import the repo in Vercel
3. In Vercel, Storage tab: connect a Neon Postgres database and create a Blob store (env vars get added automatically)
4. Add `AUTH_SECRET` manually
5. Run Prisma migrations against the production database, then optionally the seed
6. Deploy

Start now with Phase 1. At the end of each phase, give me a short summary of what was built and what I should test, then wait for my "continue" before starting the next phase.
