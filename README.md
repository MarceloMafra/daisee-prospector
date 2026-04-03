# DAISEE Prospector App

AI-powered sales lead intelligence platform with DAISEE scoring, LinkedIn profile analysis, and personalized cadencia generation for Brazilian markets.

## Features

✨ **Core Features**
- **Lead Management**: Import CSV, manage lead database, track pipeline status
- **DAISEE Scoring**: Proprietary algorithm scoring leads by seniority, company size, and segment match
- **LinkedIn Analysis**: Upload profiles, extract data, enrich lead information
- **AI Cadencias**: Generate personalized 5-touch sequences using Claude API
- **Compliance Validation**: Validate messages against LGPD, ANVISA, SUSEP, CONAR regulations
- **Sales Pipeline**: Kanban board to track leads through funnel

## Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS + Dark Mode
- React Query
- Zustand

**Backend:**
- Next.js API Routes
- Prisma ORM
- PostgreSQL (Neon)
- Claude AI API

**Testing:**
- Vitest (Unit Tests)
- Playwright (E2E Tests)
- Jest (Setup)

**DevOps:**
- GitHub Actions CI/CD
- Vercel Deployment
- Docker Support

## Prerequisites

- Node.js >= 18.18.0
- pnpm (package manager)
- PostgreSQL database (Neon recommended)
- Claude API key (from console.anthropic.com)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Database

```bash
# Create .env.local file (see below)

# Push Prisma schema to database
pnpm run db:push

# (Optional) Seed with sample data
pnpm run db:seed
```

### 3. Environment Setup

Create `.env.local` in project root:

```env
# App
NEXT_PUBLIC_APP_NAME="DAISEE Prospector"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Claude API
ANTHROPIC_API_KEY="sk-ant-..."

# Authentication (optional)
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Development Server

```bash
pnpm run dev
```

Visit http://localhost:3000

## Project Structure

```
daisee-prospector/
├── app/
│   ├── (dashboard)/          # Protected dashboard pages
│   │   ├── layout.tsx        # Dashboard layout with sidebar
│   │   ├── page.tsx          # Dashboard home
│   │   ├── leads/            # Lead management
│   │   │   ├── page.tsx      # Lead list
│   │   │   └── import/       # CSV import
│   │   ├── pipeline/         # Kanban board
│   │   ├── compliance/       # Compliance validator
│   │   └── settings/         # Settings
│   ├── api/                  # API routes
│   │   ├── leads/            # CRUD operations
│   │   ├── compliance/       # Compliance validation
│   │   └── dashboard/        # Dashboard stats
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page
│   ├── providers.tsx         # React providers
│   └── globals.css           # Global styles
├── components/
│   ├── ui/                   # Base UI components
│   └── layout/               # Layout components
├── lib/
│   ├── utils.ts              # Utility functions
│   ├── prisma.ts             # Prisma client singleton
│   ├── claude.ts             # Claude API wrapper
│   ├── daisee-score.ts       # Scoring algorithm
│   └── compliance-rules.ts   # Compliance rules
├── prisma/
│   └── schema.prisma         # Database schema
└── public/                   # Static assets
```

## Available Scripts

```bash
# Development
pnpm run dev              # Start dev server
pnpm run build            # Build for production
pnpm run start            # Run production build

# Code Quality
pnpm run lint             # Run ESLint
pnpm run type-check       # TypeScript check
pnpm run format           # Format with Prettier

# Database
pnpm run db:generate      # Generate Prisma client
pnpm run db:push          # Push schema to database
pnpm run db:migrate       # Run migrations
pnpm run db:studio        # Open Prisma Studio
pnpm run db:seed          # Seed with sample data

# Testing
pnpm run test             # Run unit tests
pnpm run test:ui          # Test UI dashboard
pnpm run test:run         # Run tests once
pnpm run test:coverage    # Generate coverage report
pnpm run test:e2e         # Run E2E tests
pnpm run test:e2e:ui      # E2E test UI
```

## API Endpoints

### Leads
```
GET    /api/leads              # List leads
POST   /api/leads              # Create lead
GET    /api/leads/{id}         # Get lead details
PUT    /api/leads/{id}         # Update lead
DELETE /api/leads/{id}         # Delete lead
POST   /api/leads/import       # Import CSV
```

### Cadencia
```
POST   /api/leads/{id}/cadencia      # Generate cadencia
GET    /api/leads/{id}/cadencia      # Get cadencia
PUT    /api/leads/{id}/cadencia      # Update cadencia
DELETE /api/leads/{id}/cadencia      # Delete cadencia
```

### Profile
```
POST   /api/leads/{id}/profile       # Upload LinkedIn PDF
GET    /api/leads/{id}/profile       # Get profile data
DELETE /api/leads/{id}/profile       # Delete profile
```

### Compliance
```
POST   /api/compliance/validate      # Validate message
GET    /api/compliance/validate      # Get rules
```

### Dashboard
```
GET    /api/dashboard/stats          # Dashboard statistics
```

## Database Schema

### Models
- **Lead**: Core lead data with DAISEE score
- **Cadencia**: 5-touch sequence for lead
- **Touch**: Individual touchpoint (LinkedIn or Email)
- **ComplianceRule**: Regulatory requirements
- **ComplianceLog**: Validation history
- **AuditLog**: Activity tracking

### Key Fields
- `daiseeScore`: 0-100 (calculated automatically)
- `status`: PROSPECTANDO, QUALIFICADO, EM_PROGRESSO, DESCARTADO, PERDIDO
- `priority`: BAIXA (0-49), MEDIA (50-79), ALTA (80-100)
- `tone`: CONSULTIVO, DIRETO, CRIATIVO

## Compliance Support

Validates against Brazilian regulations:
- **LGPD**: Lei Geral de Proteção de Dados
- **ANVISA**: Pharmaceutical regulation
- **SUSEP**: Insurance regulation
- **CONAR**: Advertising code

## Deployment

### Vercel (Recommended)

```bash
# Push to GitHub
git push origin main

# Deploy (auto-deploys from GitHub)
# Set environment variables in Vercel dashboard
```

### Docker

```bash
# Build image
pnpm run dockerbuild

# Run container
docker compose up
```

## Testing

```bash
# Run all tests
pnpm run test:run

# Watch mode
pnpm run test

# Coverage report
pnpm run test:coverage

# E2E tests
pnpm run test:e2e
```

## Troubleshooting

### Database Connection
```bash
# Verify DATABASE_URL in .env.local
# Check Neon dashboard for connection string

# Test connection
pnpm run db:studio
```

### API Issues
```bash
# Check Claude API key in .env.local
# Verify API rate limits at console.anthropic.com
```

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
pnpm run build
```

## Contributing

1. Create feature branch
2. Make changes
3. Run tests: `pnpm run test:run`
4. Submit PR

## Support

For issues and questions:
- GitHub Issues
- Email: support@daiseeprospector.com
- Documentation: https://docs.daiseeprospector.com

## License

MIT

## Next Steps

- [ ] Implement API endpoints
- [ ] Create library functions (Claude, DAISEE score, PDF extraction)
- [ ] Setup Neon database
- [ ] Run tests and fix issues
- [ ] Deploy to Vercel
- [ ] Create admin dashboard
- [ ] Implement analytics

---

**Status**: 🚀 Frontend foundation complete. Backend endpoints ready for implementation.
