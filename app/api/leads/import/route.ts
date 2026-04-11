import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDAISEEScore } from '@/lib/daisee-score'

export const dynamic = 'force-dynamic'

interface CSVRow {
  name: string
  email: string
  company: string
  seniority: string
  linkedin?: string
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const separator = lines[0].includes('\t') ? '\t' : ','
  const headers = lines[0].split(separator).map(h =>
    h.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  )

  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map(v => v.trim())
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => { obj[h] = values[idx] || '' })

    rows.push({
      name: obj.name || obj.nome || '',
      email: obj.email || '',
      company: obj.company || obj.empresa || '',
      seniority: obj.seniority || obj.senioridade || obj.cargo || '',
      linkedin: obj.linkedin || obj.linkedin_url || obj.linkedinurl || undefined,
    })
  }
  return rows
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    // Read and decode file
    const buffer = await file.arrayBuffer()
    let buf = Buffer.from(buffer)
    // Strip UTF-8 BOM if present
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      buf = buf.subarray(3)
    }
    const rawText = buf.toString('utf-8')
    const rows = parseCSV(rawText)

    // Validate and import
    let imported = 0
    let duplicates = 0
    const errors: Array<{ row: number; email: string; error: string }> = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      if (!row.name || !row.email || !row.company || !row.seniority) {
        errors.push({
          row: i + 2,
          email: row.email || 'N/A',
          error: 'Missing required fields (name, email, company, seniority)',
        })
        continue
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(row.email)) {
        errors.push({ row: i + 2, email: row.email, error: 'Invalid email format' })
        continue
      }

      try {
        const existing = await prisma.lead.findUnique({ where: { email: row.email } })
        if (existing) { duplicates++; continue }

        const scoreResult = calculateDAISEEScore({
          seniority: row.seniority,
          companySize: 'MEDIA',
          segmentMatch: 50,
        })

        await prisma.lead.create({
          data: {
            name: row.name,
            email: row.email,
            company: row.company,
            seniority: row.seniority,
            daiseeScore: scoreResult.score,
            decisionPower: scoreResult.decisionPower,
            companySize: 'MEDIA',
            segmentMatch: scoreResult.segmentMatch,
            status: 'PROSPECTANDO',
            priority: scoreResult.score >= 80 ? 'ALTA' : scoreResult.score >= 50 ? 'MEDIA' : 'BAIXA',
            linkedinUrl: row.linkedin || null,
          },
        })

        imported++
      } catch (err) {
        errors.push({
          row: i + 2,
          email: row.email,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json(
      { imported, duplicates, errors, total: rows.length, summary: `Imported ${imported} leads, skipped ${duplicates} duplicates, ${errors.length} errors` },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to import leads:', error)
    return NextResponse.json({ error: 'Failed to import leads' }, { status: 500 })
  }
}
