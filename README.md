# Blue Jays On air

A full-stack field operations and CRM platform for home service businesses. Digitizes the end-to-end workflow from lead collection → evaluation → sales pipeline → job assignment → execution → completion.

## Overview

The platform serves five distinct user roles across separate portals:

| Role | Portal | Responsibilities |
|---|---|---|
| **Admin** | `/admin` | User management, lead evaluation, job board, contractor approval, settings |
| **Sales** | `/sales` | CRM pipeline, deal management |
| **Marketing** | `/marketing` | Lead inbox, outreach tracking, contact qualification |
| **Data Collector** | `/collector` | Field lead collection with GPS, photos, OCR scanning |
| **Contractor** | `/contractor` | View job offers, accept/decline, update progress |

## Lead Lifecycle

```
Field Collection → Evaluation → Marketing Outreach → Sales Pipeline → Job Created → Assigned → Completed
     (Collector)     (Admin)        (Marketing)           (Sales)       (Admin)   (Contractor)
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, React Server Components + Server Actions)
- **UI**: Tailwind CSS 4, shadcn/ui, @base-ui/react, lucide-react
- **Auth**: Supabase Auth (SSR cookies, role-based access)
- **Database**: PostgreSQL via Supabase + Prisma ORM
- **Storage**: Supabase Storage (lead photos)
- **Email**: Resend
- **Maps**: Google Maps API (@vis.gl/react-google-maps)
- **OCR**: Google Cloud Vision API

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- Google Maps API key (with Maps JavaScript API + Geocoding API enabled)
- Google Cloud Vision API key (for OCR)
- Resend account (for email)

### Installation

```bash
git clone <repo-url>
cd home-service-platform
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, bypasses RLS) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript + Geocoding API key |
| `GOOGLE_VISION_API_KEY` | Google Cloud Vision API key (OCR) |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM` | Sender email address |

### Database Setup

```bash
# Push schema to your Supabase database
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated users are redirected to `/login`.

## Project Structure

```
src/
├── app/
│   ├── (admin)/admin/          # Admin portal
│   │   ├── dashboard/          # Overview stats
│   │   ├── evaluation/         # Lead review queue
│   │   ├── leads/[id]/         # Lead detail
│   │   ├── jobs/               # Job board
│   │   ├── users/              # User & contractor management
│   │   ├── marketing/          # Marketing inbox (admin view)
│   │   ├── sales/              # Sales pipeline (admin view)
│   │   └── settings/           # Zones configuration
│   ├── (collector)/collector/  # Field collector portal
│   │   ├── dashboard/
│   │   └── leads/              # Create / view / edit leads
│   ├── (contractor)/contractor/ # Contractor portal
│   │   ├── overview/
│   │   └── jobs/               # Job offers and active jobs
│   ├── (marketing)/marketing/  # Marketing portal
│   │   └── inbox/              # Lead outreach board
│   ├── (sales)/sales/          # Sales portal
│   ├── (auth)/                 # Login, register, invite flows
│   ├── actions/                # Server Actions
│   └── api/                    # API routes (OCR, permits, auth)
├── components/
│   ├── admin/
│   ├── collector/
│   ├── contractor/
│   ├── marketing/
│   ├── sales/
│   └── ui/                     # Shared UI components
└── lib/
    ├── supabase/               # Supabase client helpers (server/client/middleware)
    ├── prisma.ts               # Prisma client singleton
    └── collector.ts            # Auth helper for collector role
```

## Key Features

### Data Collector (Mobile-first)
- GPS pin drop + reverse geocoding for precise job site location
- Multi-category photo upload (Site / Demand / Supply / Other)
- OCR text scanning via Google Vision — auto-extracts phone, email, company, address
- Voice-to-text field notes
- City permit data auto-lookup by address (matched against municipal `permits` table)
- Offline-friendly: photos upload in background with local preview

### Admin Evaluation
- Lead queue with Urgent / Backed / New / Needs Fix / Resubmitted states
- One-click actions: Back, Urgent, Send to Marketing, Park, Delay, Needs Fix
- Reviewer comments fed back to collector for correction

### Marketing Inbox
- Kanban board: To Contact → Contacting → No Response → Contact Established
- Sentiment tags, follow-up dates, retry tracking
- Qualify lead → auto-creates Sales Deal

### Sales Pipeline
- Drag-free CRM board across deal stages
- Deal value, deadlines, project type tracking

### Job Management
- Fill job details (scope, price type, service type, timeline)
- Contractor matching scored by trade type + address proximity
- Job offer flow: Send → Contractor Accept/Decline → Assigned
- Progress notes and photos from contractor
- Admin verification on completion

### Contractor Portal
- View offers with partial address (privacy — full address revealed after acceptance)
- Accept / Decline offers
- Start job, mark complete, add progress notes

## User Invitation Flow

Admins invite internal users (Sales / Marketing / Data Collector) from `/admin/users`:

1. Admin fills email + role (+ optional Zone for Data Collectors)
2. Supabase sends invite email
3. User clicks link → `/accept-invite` → `/set-password` → redirected to their dashboard

## Contractor Registration Flow

1. `/register` — email + password
2. `/register/business-profile` — business info, trade type, insurance, T&C
3. `/register/pending` — awaiting admin approval
4. Admin approves → contractor accesses `/contractor/overview`

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npx prisma studio    # Open Prisma database UI
npx prisma db push   # Sync schema to database
npx prisma generate  # Regenerate Prisma client
```
