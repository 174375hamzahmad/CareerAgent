# CareerAgent

An AI-powered job tracking application built with Next.js that helps you manage job applications, track progress through the hiring pipeline, and prepare for interviews with Claude AI assistance.

## Features

- **Kanban Board**: Organize job applications across statuses (Saved, Applied, Interview, Offer, Rejected)
- **Job Extraction**: Automatically extract and parse job details from postings
- **AI Interview Prep**: Generate personalized interview preparation tips using Claude
- **Resume Management**: Upload and manage multiple resumes, link them to specific applications
- **Event Tracking**: Track application milestones (applied, phone screen, technical interview, offer, rejection)
- **Follow-up Reminders**: Set and track follow-up dates with your employers
- **AI Chat Assistant**: Chat with Claude about your job search for strategic advice and insights
- **Email Notifications**: Get reminders and updates via email
- **Dark Mode**: Toggle between light and dark themes
- **Search & Filter**: Filter jobs by date range and sort by newest, oldest, or company name

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **UI Library**: Shadcn/ui components built on Radix UI
- **Styling**: Tailwind CSS v4
- **Authentication**: Clerk
- **AI Integration**: Anthropic Claude SDK
- **File Storage**: Vercel Blob
- **Email**: Resend
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Theme**: next-themes

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database
- Clerk account for authentication
- Anthropic API key for Claude
- Vercel Blob token for file storage
- Resend account for email

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` file with:
   - `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
   - `DATABASE_URL` (PostgreSQL connection string)
   - `ANTHROPIC_API_KEY` (Claude API key)
   - `BLOB_READ_WRITE_TOKEN` (Vercel Blob)
   - `RESEND_API_KEY` (for email notifications)

### Setting up the Database

```bash
npm run build
```

This runs migrations and generates Prisma client.

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Building for Production

```bash
npm run build
npm run start
```

## Project Structure

```
├── app/
│   ├── api/                    # API endpoints
│   │   ├── chat/              # Claude chat API
│   │   ├── jobs/              # Job CRUD endpoints
│   │   ├── jobs/extract/      # Job extraction endpoint
│   │   ├── jobs/[id]/prep/    # Interview prep generation
│   │   ├── remind/            # Reminder notifications
│   │   └── resumes/           # Resume management
│   ├── components/            # Page components
│   ├── sign-in/ & sign-up/    # Clerk auth pages
│   ├── generated/             # Auto-generated Prisma types
│   ├── types.ts               # TypeScript type definitions
│   └── page.tsx               # Main dashboard page
├── components/
│   └── ui/                    # Reusable UI components
├── lib/
│   ├── prisma.ts              # Prisma client instance
│   └── utils.ts               # Utility functions
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
└── public/uploads/            # Uploaded resumes storage
```

## Database Schema

**Models:**
- **Job**: Core job application with extracted details, status, recruiter info, and linked resume
- **Resume**: User's resume files with metadata
- **Event**: Timeline events for each job (application, interviews, offers, rejections, notes)

## Key Components

- **Board**: Main dashboard with Kanban columns and job filtering
- **JobCard**: Displays job summary with quick actions
- **JobDetailPanel**: Full job details, notes, and event history
- **AddJobModal**: Create or paste new job postings
- **ChatPanel**: Claude chat interface for job search advice
- **ResumeManager**: Upload and manage resume files
- **ResumePicker**: Select resume for job application

## API Endpoints

- `POST /api/jobs` - Create a new job
- `GET /api/jobs` - List user's jobs
- `PATCH /api/jobs/[id]` - Update a job
- `DELETE /api/jobs/[id]` - Delete a job
- `POST /api/jobs/extract` - Extract details from job posting text
- `POST /api/jobs/[id]/prep` - Generate interview prep
- `POST /api/chat` - Send message to Claude
- `POST /api/resumes` - Upload resume
- `GET /api/resumes` - List resumes
- `DELETE /api/resumes/[id]` - Delete resume
- `POST /api/remind` - Send follow-up reminder

## Deploy on Vercel

The easiest way to deploy is using the [Vercel Platform](https://vercel.com).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## License

This project is open source and available under the MIT License.
