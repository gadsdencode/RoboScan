# ROBOSCAN - Website Scanner Application

## Overview

ROBOSCAN is a web application that scans websites for robots.txt and llms.txt files, analyzing bot permissions and providing detailed reports. The application features a cyberpunk-themed UI and allows users to input a URL to receive instant analysis of how the website handles bot crawling permissions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**UI Component Library**: The application uses shadcn/ui (new-york style variant) with Radix UI primitives for accessible, customizable components. The design system is built on Tailwind CSS with custom theming and CSS variables for consistent styling.

**State Management**: TanStack Query (React Query) handles server state management, providing caching, background updates, and request deduplication. The query client is configured with custom error handling and disabled automatic refetching.

**Routing**: Wouter provides lightweight client-side routing with a simple Switch/Route pattern.

**Styling Approach**: Custom Tailwind theme with a cyberpunk aesthetic featuring cyan neon accents on a dark background. The theme uses CSS custom properties for color management and includes custom animation utilities.

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript, configured as an ES module.

**API Design**: RESTful API with a single POST endpoint `/api/scan` that accepts a URL and returns scan results. Request validation uses Zod schemas for type-safe input validation.

**Development vs Production**: In development, Vite middleware integrates with Express for hot module replacement. In production, the server serves static files from the built client bundle.

**Storage Layer**: Abstract storage interface (`IStorage`) with an in-memory implementation (`MemStorage`) for development. The interface supports both user management and scan result persistence, designed to be swappable with a database implementation.

**Scanner Logic**: Custom website scanner fetches and parses robots.txt and llms.txt files from target domains. It normalizes URLs, handles timeouts, extracts bot permissions, and returns structured results with errors and warnings.

### Data Storage Solutions

**Current Implementation**: In-memory storage using Map data structures for both users and scans. This provides fast access during development but data is lost on server restart.

**Schema Definition**: Drizzle ORM with PostgreSQL dialect defines the data model. Two main tables exist:
- `users`: Contains user authentication data (id, username, password)
- `scans`: Stores scan results including URL, robots.txt/llms.txt content, bot permissions, errors, and warnings

**Migration Strategy**: Drizzle Kit manages schema migrations with the output directory set to `./migrations`.

**Database Configuration**: Environment variable `DATABASE_URL` required for PostgreSQL connection via Neon serverless driver.

### Authentication and Authorization

**Current State**: User schema and storage interface exist but authentication is not implemented in the current routes. The storage layer supports user creation and lookup by ID or username.

**Session Management**: Dependencies include `connect-pg-simple` for PostgreSQL-backed session storage and `express-session` (implied by the session store package).

### External Dependencies

**Database Service**: Configured for Neon Serverless PostgreSQL through `@neondatabase/serverless` package.

**Development Tools**: 
- Replit-specific Vite plugins for runtime error overlay, cartographer, and dev banner
- Drizzle Kit for database migrations and schema management
- tsx for TypeScript execution in development

**UI Dependencies**:
- Complete Radix UI primitive library for accessible components
- Lucide React for iconography
- TailwindCSS with @tailwindcss/vite plugin
- class-variance-authority for variant-based component styling
- Various form handling libraries (react-hook-form, @hookform/resolvers)

**Font Loading**: Google Fonts integration loading Architects Daughter, DM Sans, Fira Code, and Geist Mono font families.