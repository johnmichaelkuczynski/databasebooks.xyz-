# Text Intelligence Studio

## Overview

Text Intelligence Studio is a web application that provides advanced text analysis capabilities powered by multiple LLM providers. The application analyzes text documents and generates structured outputs including extracted quotes, annotated quotes with context, compressed summaries, and database representations. Users can upload or paste text, select from multiple LLM providers (OpenAI, Anthropic, Grok, Perplexity, DeepSeek), and receive comprehensive analysis results.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, using Vite as the build tool and development server.

**Routing**: Wouter for lightweight client-side routing with a simple route structure.

**State Management**: 
- Zustand for global state management, specifically for storing LLM API keys with persistence to localStorage
- React Query (@tanstack/react-query) for server state management and API data fetching
- Local component state using React hooks

**UI Components**: Comprehensive shadcn/ui component library built on Radix UI primitives, styled with Tailwind CSS using the "new-york" style variant. The design system uses CSS variables for theming with a neutral base color.

**Styling**: 
- Tailwind CSS v4 with custom theme configuration
- CSS variables for theming support
- Custom fonts: Inter (sans), Crimson Pro (serif), and JetBrains Mono (monospace)
- Responsive design with mobile-first approach

**Form Handling**: React Hook Form with Zod schema validation via @hookform/resolvers.

### Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js.

**Development vs Production**:
- Development mode uses Vite's middleware mode for HMR (Hot Module Replacement) and serves the development build
- Production mode serves pre-built static assets from the dist directory
- Separate entry points (index-dev.ts and index-prod.ts) handle environment-specific setup

**API Design**: REST API with a single analysis endpoint (`POST /api/analyze`) that accepts text and provider selection, returning structured analysis results.

**Request/Response Flow**:
- Request body capture for logging using custom middleware that stores raw body
- JSON parsing with verification for debugging
- Comprehensive request/response logging including duration, status codes, and response bodies (truncated for readability)

**LLM Integration**: 
- Abstracted LLM service layer in `server/llm.ts` that handles multiple providers
- Dynamic quote extraction based on text length (minimum 3 quotes per 600 words)
- Structured JSON output format enforced via API parameters
- OpenAI GPT-4o model currently implemented with JSON mode for reliable structured outputs

**Error Handling**: Centralized error handling with descriptive error messages returned to the client.

### Data Storage

**Database**: PostgreSQL configured via Drizzle ORM with schema-first design approach.

**ORM**: Drizzle ORM provides type-safe database access with schema located in `shared/schema.ts`.

**Schema**: Simple user table with UUID primary keys, username, and password fields. The schema is shared between client and server via the `@shared` path alias.

**Migrations**: Drizzle Kit manages migrations with configuration pointing to PostgreSQL via DATABASE_URL environment variable.

**In-Memory Fallback**: MemStorage implementation provides a development/testing storage layer without requiring database setup.

**Connection**: Neon serverless driver for PostgreSQL connectivity optimized for serverless environments.

### Architecture Decisions

**Monorepo Structure**: Single repository containing client, server, and shared code with TypeScript path aliases for clean imports (@, @shared, @assets).

**Why chosen**: Simplifies development workflow, ensures type safety across boundaries, and enables code sharing between frontend and backend.

**Pros**: Single source of truth for types, easier refactoring, simplified dependency management.

**Cons**: Larger bundle size during development, more complex build configuration.

**Type Safety**: End-to-end TypeScript with strict mode enabled and shared schema definitions using Drizzle-Zod for runtime validation.

**Why chosen**: Prevents runtime errors, improves developer experience with autocomplete, and ensures contract consistency.

**Build Process**: Vite for frontend bundling and esbuild for backend bundling, both optimized for production with minimal configuration.

**Why chosen**: Fast build times, modern ESM support, and excellent TypeScript integration.

**Session Management**: Connect-pg-simple for PostgreSQL-backed session storage (configured but not fully implemented in visible code).

## External Dependencies

### Third-Party Services

**LLM Providers**:
- OpenAI (GPT-4o) - Primary implementation visible in codebase
- Anthropic (Claude) - Configured but implementation not shown
- Grok - Configured but implementation not shown  
- Perplexity - Configured but implementation not shown
- DeepSeek - Configured but implementation not shown

API keys are stored client-side in localStorage via Zustand persist middleware and passed to the server with each request.

### Database

**PostgreSQL**: Primary database accessed via Neon serverless driver (@neondatabase/serverless).

**Connection**: Configured through DATABASE_URL environment variable required for both runtime and migrations.

### External Libraries

**UI Components**: 
- Radix UI primitives for accessible, unstyled component foundation
- Lucide React for icons
- Embla Carousel for carousel functionality
- cmdk for command palette interface

**Development Tools**:
- Replit-specific Vite plugins: runtime error modal, cartographer (dev mode only), dev banner (dev mode only)
- Custom meta images plugin for dynamic OpenGraph image injection based on Replit deployment URL

**Utilities**:
- date-fns for date manipulation
- nanoid for ID generation  
- clsx and tailwind-merge (via cn utility) for conditional class names
- class-variance-authority for component variant management

### Build and Development

**Vite Configuration**: Custom setup with React plugin, Tailwind CSS v4 plugin, and conditional Replit plugins that only load in development on Replit platform.

**TypeScript Configuration**: Strict mode with ESNext module resolution, bundler module resolution strategy, and path aliases for clean imports.

**Package Management**: npm with lockfile version 3.