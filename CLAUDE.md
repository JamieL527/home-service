@AGENTS.md

# Home Service Platform

## Project Overview
Home renovation / repair service marketplace + project execution management system.
Core goal: digitize the full lifecycle — "lead capture → evaluation → project conversion → contractor assignment → execution → payment collection."

## Tech Stack
- Next.js 16.2.4 (App Router, React Server Components + Server Actions)
- React 19.2.4
- TypeScript 5
- Supabase (@supabase/ssr + @supabase/supabase-js) — auth + PostgreSQL
- Prisma 6 — ORM for business data
- Tailwind CSS 4
- shadcn/ui (based on Radix/Base UI)
- @base-ui/react
- lucide-react
- class-variance-authority + clsx + tailwind-merge

## Architecture
- Dual client mode: Supabase server client (SSR) + browser client (client components)
- httpOnly cookie stores user-role for middleware auth
- src/proxy.ts handles route protection

## User Roles (5)
- CONTRACTOR: construction company user, self-registers → fills profile → awaits approval → receives jobs
- ADMIN: platform admin, approves contractors, manages users, invites internal users
- SALES: manages CRM and leads (invited by Admin)
- MARKETING: lead pipeline management (invited by Admin)
- DATA_COLLECTOR: field collector, captures leads (invited by Admin)

## Data Model
User → ContractorCompany → Job ← Lead → Deal
Main models: User / ContractorCompany / Lead / LeadContact / Job / JobOffer / Deal / Zone

Note: standalone Contractor model removed; contractors are represented by ContractorCompany.

Zone fields: id, name, description, color, createdAt, updatedAt
  Default data: North York Hub (#3b82f6), Downtown (#8b5cf6)

User: zones (→Zone[], many-to-many via _CollectorZones, DATA_COLLECTOR only)

ContractorCompany fields: name, status, businessNumber, address, website, tradeType,
  wsibNumber, insuranceNumber, contactName, contactTitle, contactEmail, contactPhone,
  termsAccepted, termsAcceptedAt, adminNote

Job fields: leadId, phase, status(JobStatus), scope, priceType, priceFixed, priceMin,
  priceMax, timeline, serviceType, contractorType, companyId(→ContractorCompany), progressNote

JobOffer fields: jobId, companyId(→ContractorCompany), status(pending/accepted/rejected), sentAt, respondedAt

Lead additional fields: reviewComment, submittedAt, isUrgent, scheduledInjectAt,
  marketingTag, retryCount(@default(0)), nextFollowUpDate, marketingNote, sentimentTag,
  zoneId, zoneName

## ContractorCompany Status Flow
UNVERIFIED_PROFILE → (submit profile) → PENDING_APPROVAL → (Admin approves) → ACTIVE
                                                           → REJECTED
                                                           → ACTION_REQUIRED → (update profile) → PENDING_APPROVAL

## JobStatus Enum
PENDING → (Fill Details) → READY → (Send Offer) → OFFER_SENT → (Accept) → ASSIGNED
→ (Start) → IN_PROGRESS → (Complete) → COMPLETED → (Admin verify) → VERIFIED
CANCELLED (available at any time)

## LeadStatus Flow
SUBMITTED → (evaluate) → NEW_LEAD / BACKED / URGENT / PARKED / SCHEDULED / NEEDS_FIX / RESUBMITTED
→ (Send to Marketing) → MARKETING_INBOX → (Accept) → TO_CONTACT → CONTACTING → NO_RESPONSE / CONTACT_ESTABLISHED
→ (Qualify) → QUALIFIED → JOB_ACTIVE

NEEDS_FIX flow: Admin flags → collector edits → collector resubmits → RESUBMITTED → Admin re-evaluates
Note: injectLead now sets status→MARKETING_INBOX instead of creating a Job. Job creation moved to after Sales Deal Won.

## Route Structure
- /login: unified login page
- /register: Contractor registration (Step 1: account creation)
- /register/business-profile: fill Business Profile (Step 2, includes tradeType selection)
- /register/pending: awaiting approval page
- /register/verify-email: check your email page (after registration)
- /forgot-password: forgot password
- /reset-password: reset password
- /accept-invite: accept invite (internal users)
- /set-password: set password (after accepting invite)
- /admin/*: platform admin panel
- /contractor/*: contractor workspace (ACTIVE status required)
- /collector/*: field collection
- /marketing/*: marketing workspace (MARKETING + ADMIN accessible)

## Contractor Registration Flow
1. /register → enter First Name (optional), Last Name (optional), Email, Password
   → creates Supabase user + Prisma User(role=CONTRACTOR) + ContractorCompany(status=UNVERIFIED_PROFILE)
   → sets user-role cookie → redirects to /register/verify-email
   → verification email sent via Supabase with emailRedirectTo → /api/auth/callback?next=/register/business-profile
2. /register/business-profile → fill Business Info (Trade/Service Type dropdown required)
   + Person in Charge + Insurance & Compliance + T&C checkbox
   → updates ContractorCompany (status=PENDING_APPROVAL) → redirects to /register/pending
3. /register/pending → shows pending review message, can sign out

## Contractor Post-Login Routing (by company status)
- UNVERIFIED_PROFILE → /register/business-profile
- PENDING_APPROVAL → /register/pending
- ACTION_REQUIRED → /register/business-profile
- REJECTED → login page with error
- ACTIVE → /contractor/overview

## Internal User Invite Flow
Admin at /admin/users, via Invite User dialog enters email and role (SALES/MARKETING/DATA_COLLECTOR)
→ DATA_COLLECTOR role shows Zone multi-select checkboxes, saved to User.zones (many-to-many)
→ Supabase inviteUserByEmail → user clicks email link → /accept-invite → /set-password → respective dashboard

## Admin Approval (/admin/contractors)
Shows PENDING_APPROVAL + ACTION_REQUIRED contractors with full Business Profile (incl. tradeType):
- Approve → ACTIVE (sends branded approval email via Resend)
- Request More Info → ACTION_REQUIRED (dialog for note, sends branded needs-more-info email via Resend)
- Reject → REJECTED (dialog for reason, stored as adminNote, sends branded rejection email via Resend)

## Completed Modules

### Core
- Database Schema
- Contractor registration (two-step flow) / login / status routing
- Internal user invite (Admin → SALES/MARKETING/DATA_COLLECTOR)
- Forgot password / reset password / accept invite / set password
- Admin Dashboard (contractor approval with full profile, three-button actions)
- Admin user management (invite internal users, manage zones per collector)
- Unified password rules (8+ chars, upper/lower/number/special)

### Data Collector Module (/collector/*)
- /collector/dashboard: today's stats (collected/Draft/Needs Fix), draft quick-fill cards, Needs Fix red cards
- /collector/leads: lead list with ⚠️ NEEDS_FIX markers
- /collector/leads/new: new lead form (Google Maps pin + reverse geocoding + voice-to-text)
  - Real-time blue dot GPS tracking with direction arrow
  - GPS trail line showing walked path (breadcrumb trail)
  - Route task polygon overlay showing assigned area
- /collector/leads/[id]: lead detail (Location/Photos/Demand+Contacts/Supply/Field Notes sections)
  - Data completeness warning bar (orange warning when businessName/contacts/notes missing)
  - NEEDS_FIX banner: shows reviewComment, includes Edit & Resubmit buttons
  - NotesForm: inline Field Notes editing
- /collector/leads/[id]/edit: edit page (Demand Side / Supply / Field Notes / Contacts CRUD)
- /collector/routes: route task list, filtered by assignedToId = user.id, grouped by status
- /collector/routes/[id]: map detail page, polygon color matches admin setting
  - Buttons: Start Collecting (assigned/in_progress) / Done (in_progress)
  - No accept step — tasks are directly assigned by admin
- Server actions: resubmitLead, updateLeadNotes, updateLeadDetails, completeRouteTask, releaseRouteTask

### Admin Evaluation Module (/admin/evaluation)
- Stats cards (Backed/New/Urgent/Total), Phase colored filter tabs
- Action Queue (URGENT red section)
- Two-column layout: Backed Leads (left) / New Leads (right)
- New Leads card states: NEEDS_FIX (orange), RESUBMITTED (blue), normal (white)
- NeedsFixButton: dialog for comment → markLeadNeedsFix (status→NEEDS_FIX)
- "Send to Marketing" button → injectLead → status→MARKETING_INBOX (no Job created)
- Server actions: backLead, markLeadUrgent, injectLead, parkLead, delayLead, markLeadNeedsFix

### Admin Parking Module (/admin/parking)
- Injection queue (READY TODAY + Scheduled two-column) + horizontal Phase kanban
- InjectionQueueCard (inline action buttons, date picker dialog, Phase move dialog)
- scheduledInjectAt + isUrgent fields

### Admin Lead Detail (/admin/leads/[id])
- 6 sections: Location / City Data / Demand Side (with Contacts) / Supply Side / Photos / Field Notes
- All sections have empty states
- Actions panel shown when user has permission (Back/Urgent/Inject etc.)
- Linked Jobs list with clickable links
- SALES role can access /admin/evaluation, /admin/parking, /admin/leads/*

### Admin Job Board (/admin/jobs)
- Job list + Phase filter + status stats cards
- Buttons: PENDING→"Fill Details", READY→"Find Contractor", others→"View Offer"/"View Details"
- "Lead Detail" button: all statuses link to /admin/leads/[leadId]
- /admin/jobs/[id]: Fill Details form (serviceType, contractorType, scope, pricing, timeline)
- /admin/jobs/[id]/match: Contractor matching page
  - Queries ACTIVE ContractorCompany, scored by address(+2) + tradeType(+1)
  - Send Offer → JobOffer(status=pending) + Job(status=OFFER_SENT)
- Server actions: updateJobDetails, sendJobOffer, cancelJob

### Contractor Jobs Module (/contractor/jobs)
- Stats cards: New Offers (blue) / Active Jobs (green) / Completed (gray)
- Tab filter: New Offers | Active | Completed
- New Offers cards: city/area only (full address hidden), Phase, Service Type, Scope, Price, Timeline
  - Accept → JobOffer(accepted) + Job(ASSIGNED)
  - Decline → JobOffer(rejected) + Job(READY)
- /contractor/jobs/[id]: Job detail with status updates, Progress Notes inline editing
- Server actions (contractor-jobs.ts): acceptOffer, rejectOffer, updateJobStatus, updateJobNote

### Admin Job Verification (/admin/jobs/[id])
- COMPLETED status shows "Progress Notes from Contractor" + green "Ready to Verify?" block
- Verify Job button → verifyJob action → status→VERIFIED

### Admin Permits Map (/admin/permits)
- Route: /admin/permits, sidebar entry above User Management (Map icon)
- Data source: permits table via Supabase service role key bypassing RLS
- Layout: desktop two-column; mobile top List/Map tab switch
- Left panel: search, Status/Type/Year filters, pagination (50 per page)
- Right map (@vis.gl/react-google-maps): grouped markers, InfoWindow with permit details
- Heatmap: toggle button, viewport-filtered top 50 cells, rank-based color gradient (red→orange→yellow→blue)
  - Uses get_permit_heatmap Supabase RPC function (deduplicates by street_num+street_name+street_type)
- API: POST /api/admin/permits + POST /api/admin/permits/heatmap

### Admin Settings Module (/admin/settings)
- Tabs: General (placeholder) / Zones
- Zones Tab: zone list (name/description/color swatch), Add Zone button, Edit/Delete
- Add/Edit dialog: Zone Name (required), Description (optional), Color (10-color preset picker)
- Delete confirmation: auto-disconnects associated users' zones before deleting
- Server actions (settings.ts): createZone, updateZone, deleteZone

### Marketing Module (/marketing/*)
- Layout: dark blue-purple sidebar (gradient) + white top bar
- Navigation: Inbox / Activity (placeholder)
- /marketing/inbox: Marketing Inbox
  - 3 tabs: Inbox (blue) / Re-Activated (green) / Returned Error (red)
  - 4-column kanban: To Contact / Contacting / No Response / Contact Shared
  - Right detail panel (w-72): Contact info / Sentiment Tag / follow-up date / notes / action buttons
- Server actions (marketing.ts): acceptInboxLead, rejectInboxLead, startContacting,
  markNoResponse, markContactEstablished, retryContact, parkLeadMarketing, setFollowUpDate,
  qualifyLead, updateMarketingNote, updateSentimentTag

### Route Tasks Module
- Data model: RouteTask (id, name, polygon:Json, color, zoneId→Zone, createdById, assignedToId→User, status, createdAt, updatedAt)
- RouteTask.status: assigned / in_progress / completed
- Lead additional field: routeTaskId→RouteTask (optional)
- Tasks are directly assigned by admin to a specific collector (no accept step)

#### Admin (/admin/routes)
- Layout: white left panel (task list) + right Google Maps fullscreen; mobile Tasks/Map tab switch
- Drawing: click "Draw New Zone" → manual vertex-by-vertex polygon drawing
  - Supports Undo (remove last vertex) / Cancel / close by clicking first vertex
  - Mouse-follow guide line while drawing
- Save panel (appears after polygon closed): Task Name + color picker (10 colors) + Zone dropdown + Collector dropdown (filtered by selected zone) + Discard/Edit/Publish
- Task list: Assigned / In Progress / Completed groups
  - Zone dropdown filter
  - Click card → highlights polygon on map and pans
  - TaskCard actions: rename (inline) / reassign (inline collector picker, filtered by zone) / delete
- Server actions (route-tasks.ts): createRouteTask, deleteRouteTask, updateRouteTaskStatus, renameRouteTask, adminReassignRouteTask

#### Collector (/collector/routes)
- /collector/routes: list page, shows tasks where assignedToId = user.id, grouped by status
- /collector/routes/[id]: map detail page, polygon color matches admin setting
  - Buttons: Start Collecting (assigned/in_progress) / Done (in_progress)
- /collector/leads/new: map shows assigned task polygon overlay (TaskPolygonOverlay, clickable:false)
  - Task chip above map; submitting lead auto-writes routeTaskId
  - First lead submission auto-transitions task assigned → in_progress
- /collector/dashboard: My Routes section with status cards (Assigned/In Progress/Completed)
- Server actions: completeRouteTask

### Email System
- Approval/Rejection/Needs-More-Info emails sent via Resend using branded HTML templates
- Comment notifications on estimation workspace sent via Resend
- Quote emails sent via Resend with PDF attachment support
- Supabase handles: verification email, invite email, password reset email (configured in Supabase Dashboard → Authentication → Email Templates)
- RESEND_TO_OVERRIDE env var overrides recipient for local testing

## Development Guidelines
- All UI text in English
- Use shadcn/ui components (contractor side) / native Tailwind (admin/collector side)
- Role-based access control strictly enforced
- Data isolation: Contractor can only see own company data (companyId)
- Commit after completing new features
- Prisma enums in older generated client may need `as never` or `as string` cast until prisma db push
- Job/JobOffer linked to ContractorCompany via companyId (not Contractor)
- resubmitLead does NOT clear reviewComment — preserved for admin cross-reference
