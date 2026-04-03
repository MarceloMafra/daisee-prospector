# DAISEE Prospector - Next Steps

**Current Status**: ✅ Frontend + Config Complete | 🔄 Ready for Backend

---

## Immediate Actions (Next Session)

### 1️⃣ Database Setup (30 min)
```bash
# Create Neon account at https://neon.tech
# Get DATABASE_URL from Neon console

# Create .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_APP_NAME="DAISEE Prospector"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DATABASE_URL="postgresql://user:password@host:port/database"
ANTHROPIC_API_KEY="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"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
EOF

# Install & migrate
pnpm install
pnpm run db:push
pnpm run db:seed

# Verify
pnpm run db:studio
```

### 2️⃣ Install Dependencies (5 min)
```bash
pnpm install
# This adds: next-themes, tailwind-merge, radix-ui, etc.
```

### 3️⃣ Start Development Server (Verify Frontend)
```bash
pnpm run dev
# Visit http://localhost:3000
# Test: Home page → Import leads → Pipeline
```

---

## Implementation Phases (Priority Order)

### Phase 1: Core Lead Management (Days 1-2)
**Files to Create:**
- `lib/prisma.ts` - Prisma client singleton
- `lib/daisee-score.ts` - DAISEE algorithm
- `app/api/leads/route.ts` - Lead CRUD endpoints
- `app/api/leads/import/route.ts` - CSV import (complete)
- `app/api/dashboard/stats/route.ts` - Dashboard metrics

**Endpoints to Complete:**
1. GET /api/leads (list with filters)
2. POST /api/leads (create single)
3. GET /api/leads/{id} (detail)
4. PUT /api/leads/{id} (update)
5. DELETE /api/leads/{id} (delete)
6. POST /api/leads/import (CSV import)
7. GET /api/dashboard/stats (KPI metrics)

**Key Logic:**
- Parse CSV files with validation
- Calculate DAISEE scores (formula: 30% seniority + 35% company + 25% segment + 10% other)
- Check for duplicate emails
- Proper error handling

### Phase 2: PDF & Cadencia (Days 3-4)
**Files to Create:**
- `lib/claude.ts` - Claude API wrapper
- `lib/pdf.ts` - PDF extraction utilities
- `app/api/leads/[id]/profile/route.ts` - PDF endpoints
- `app/api/leads/[id]/cadencia/route.ts` - Cadencia endpoints

**Endpoints to Complete:**
1. POST /api/leads/{id}/profile (upload PDF)
2. GET /api/leads/{id}/profile (get extracted text)
3. DELETE /api/leads/{id}/profile (delete profile)
4. POST /api/leads/{id}/cadencia (generate with AI)
5. GET /api/leads/{id}/cadencia (get cadencia)
6. PUT /api/leads/{id}/cadencia (edit cadencia)
7. DELETE /api/leads/{id}/cadencia (delete cadencia)

**Key Logic:**
- Extract text from PDF using pdf-parse
- Call Claude API with prompt engineering
- Generate 5 unique touches (T1-T5)
- Support 3 tones: CONSULTIVO, DIRETO, CRIATIVO
- Proper error handling for API rate limits

### Phase 3: Compliance Validation (Day 5)
**Files to Create:**
- `lib/compliance-rules.ts` - Validation rules
- `app/api/compliance/validate/route.ts` - Validation endpoint

**Endpoints to Complete:**
1. POST /api/compliance/validate (validate message)
2. GET /api/compliance/validate (get rules)

**Key Logic:**
- Check against forbidden keywords per regulation
- Verify required statements present
- Calculate compliance score
- Support 4 regulations: LGPD, PHARMA, INSURANCE, CONAR
- Log to ComplianceLog table

### Phase 4: Testing & Polish (Day 6)
**Create:**
- Unit tests in `__tests__/lib/`
- Integration tests in `__tests__/api/`
- E2E tests in `e2e/`
- GitHub Actions workflow

**Verify:**
- All endpoints respond correctly
- Database queries are optimized
- Error handling works
- Frontend integration works
- Tests pass with >80% coverage

### Phase 5: Deployment (Day 7)
**Setup:**
- GitHub Actions CI/CD
- Vercel deployment configuration
- Production environment variables
- Database backup plan

**Verify:**
- App runs locally (pnpm run dev)
- App builds successfully (pnpm run build)
- App starts in production (pnpm run start)
- Deployed to Vercel and accessible

---

## Code Structure to Follow

### Create New Lib Utility
```typescript
// lib/new-feature.ts
export function doSomething(input: string): string {
  // Implementation
}

// Export from lib/index.ts (optional)
```

### Create New API Endpoint
```typescript
// app/api/resource/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Implementation
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Message' }, { status: 500 })
  }
}
```

### Database Usage
```typescript
import { prisma } from '@/lib/prisma'

// Query
const lead = await prisma.lead.findUnique({ where: { id } })

// Create
const newLead = await prisma.lead.create({ data: {...} })

// Update
const updated = await prisma.lead.update({ where: {id}, data: {...} })
```

---

## Key Implementation Details

### DAISEE Algorithm
```
Score = 100

If seniority = VP/CEO/Founder → +30
Else if Manager → +20
Else if IC → +10
Else → 0

If company size = GRANDE → +35
Else if MEDIA → +25
Else if PEQUENA → +15
Else → 5

If segment matches → +25
Else if related → +12
Else → 0

+ 10 points for complete profile

Clamp to 0-100
```

### CSV Import
- Columns required: name, email, company, seniority
- Validate email format
- Check for duplicates
- Calculate score for each
- Return summary: imported count, duplicates skipped, errors

### Claude Integration
- Use @anthropic-ai/sdk
- Prompt should include lead name, company, seniority, profile text
- Generate unique content per touch
- Handle rate limiting (retry with backoff)
- Log API usage for debugging

### PDF Extraction
- Accept .pdf files only
- Use pdf-parse library
- Extract full text
- Store in profileText field
- Update profileUrl with file path/S3 URL

---

## Git Workflow

After each phase:
```bash
git add .
git commit -m "feat: complete [feature name]

- Endpoint 1: GET /api/resource
- Endpoint 2: POST /api/resource
- Implementation: [brief description]"

git log --oneline  # Verify commits
```

---

## Testing Checklist

For each endpoint:
- [ ] Manual test with curl/Postman
- [ ] Test with valid data
- [ ] Test with invalid data
- [ ] Test with edge cases
- [ ] Test error scenarios
- [ ] Write automated test
- [ ] Check database records created correctly
- [ ] Verify response format matches schema

---

## Performance Targets

- API response time: <100ms
- CSV import: <5 seconds for 100 leads
- Claude API call: <10 seconds
- PDF extraction: <3 seconds per file
- Database query: <50ms

---

## Troubleshooting

**Database Connection Issue:**
```bash
# Verify .env.local has DATABASE_URL
cat .env.local

# Test connection
pnpm run db:studio

# Check Neon dashboard for active connections
```

**API Route Not Found:**
```bash
# Verify file is at correct path
ls app/api/leads/route.ts

# Check file exports GET/POST/etc
cat app/api/leads/route.ts
```

**Claude API Error:**
```bash
# Verify API key in .env.local
echo $ANTHROPIC_API_KEY

# Check API limits at console.anthropic.com

# Retry with exponential backoff
```

---

## Success Indicators

✅ All 13 API endpoints functional  
✅ CSV import working (100+ leads)  
✅ DAISEE scores calculating correctly  
✅ Claude API generating unique cadencias  
✅ PDF extraction working  
✅ Compliance validation catching errors  
✅ Database properly populated  
✅ Tests >80% coverage  
✅ Deployed to Vercel  
✅ App accessible and responsive  

---

**You have the foundation. Now build the features!**

Need help? Check:
1. IMPLEMENTATION_STATUS.md - What's done/pending
2. README.md - API endpoint documentation
3. API_REFERENCE.md (in memory) - Detailed specs
4. app_architecture.md (in memory) - Code patterns

Good luck! 🚀
