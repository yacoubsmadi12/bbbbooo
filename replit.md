# MuseAI - AI-Powered Book Writing Application

## Overview

MuseAI is an AI-powered book writing and authoring platform that helps users create, organize, and generate book content. The application enables users to manage books with chapters, generate outlines using AI, create chapter content with AI assistance, and export completed works to PDF format.

The core workflow involves:
1. Creating a book with metadata (title, genre, target audience, tone, POV, word count goals)
2. Generating an AI-powered outline for the book
3. Creating and organizing chapters
4. Using AI to generate chapter content
5. Using AI to generate beautiful illustrations for each chapter (gpt-image-1)
6. Editing and refining content in a focused editor view
7. Exporting the final book as PDF with clean table of contents formatting

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Animations**: Framer Motion for transitions
- **Form Handling**: React Hook Form with Zod validation

Key pages:
- Dashboard (`/`) - Book listing and management
- BookDetail (`/book/:id`) - Outline editing and chapter management
- Editor (`/book/:bookId/chapter/:chapterId`) - Chapter content editing

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Build Tool**: esbuild for server, Vite for client
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts`

The server handles:
- CRUD operations for books and chapters
- AI content generation (outlines, chapters, images)
- PDF export generation using PDFKit

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema Location**: `shared/schema.ts`

Core entities:
- `books` - Book metadata and outline
- `chapters` - Chapter content with ordering and completion status
- `conversations` / `messages` - Chat history for AI integrations

### Shared Code Structure
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` - Database schemas and Zod validation schemas
- `routes.ts` - API route definitions with input/output types

### AI Integration
- **Provider**: OpenAI-compatible API via Replit AI Integrations
- **Features**: Text generation, image generation, voice processing
- **Location**: `server/replit_integrations/` contains reusable AI utilities

## External Dependencies

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Connection pooling with `pg` package
- Session storage compatible with `connect-pg-simple`

### AI Services
- OpenAI API (configured via Replit AI Integrations)
- Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
- Used for: text generation (GPT), image generation (`gpt-image-1`), speech-to-text/text-to-speech

### Third-Party Libraries
- **PDFKit**: Server-side PDF generation for book exports
- **date-fns**: Date formatting throughout the application
- **Radix UI**: Accessible component primitives (via shadcn/ui)

### Development Tools
- Vite dev server with HMR
- Replit-specific plugins for development banners and error overlays
- Drizzle Kit for database migrations (`npm run db:push`)