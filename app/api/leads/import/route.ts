import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDAISEEScore } from '@/lib/daisee-score'

export const dynamic = 'force-dynamic'
import { Readable } from 'stream'
import csv from 'csv-parser'

interface CSVRow {
  name: string
  email: string
  company: string
  seniority: string
  linkedin?: string
  linkedin_url?: string
  linkedinUrl?: string
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const buffer = await file.arrayBuffer()
    // Strip UTF-8 BOM if present (EF BB BF) before parsing
    let buf = Buffer.from(buffer)
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      buf = buf.subarray(3)
    }
    // Decode as UTF-8 string so csv-parser handles accents correctly
    const rawText = buf.toString('utf-8')
    const stream = Readable.from([rawText])
    const firstLine = rawText.split('\n')[0] || ''
    const separator = firstLine.includes('\t') ? '\t' : ','

    // Parse CSV with normalized headers (lowercase + trim)
    const rows: CSVRow[] = []
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv({
          separator,
          mapHeaders: ({ header }: { header: string }) =>
            header.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        }))
        .on('data', (row: Record<string, string>) => {
          // Map portuguese column names to english
          const normalized: CSVRow = {
            name: (row.name || row.nome || '').trim(),
            email: (row.email || '').trim(),
            company: (row.company || row.empresa || '').trim(),
            seniority: (row.seniority || row.senioridade || row.cargo || '').trim(),
            linkedin: (row.linkedin || row.linkedin_url || row.linkedinUrl || '').trim() || undefined,
          }
          rows.push(normalized)
        })
        .on('error', reject)
        .on('end', resolve)
    })

    // Validate and import
    let imported = 0
    let duplicates = 0
    const errors: Array<{ row: number; email: string; error: string }> = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Validate required fields
      if (!row.name || !row.email || !row.company || !row.seniority) {
        errors.push({
          row: i + 2, // +2 because CSV has header and 0-indexing
          email: row.email || 'N/A',
          error: 'Missing required fields (name, email, company, seniority)',
        })
        continue
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(row.email)) {
        errors.push({
          row: i + 2,
          email: row.email,
          error: 'Invalid email format',
        })
        continue
      }

      try {
        // Check for duplicates
        const existing = await prisma.lead.findUnique({
          where: { email: row.email },
        })

        if (existing) {
          duplicates++
          continue
        }

        // Calculate DAISEE score
        const scoreResult = calculateDAISEEScore({
          seniority: row.seniority,
          companySize: 'MEDIA', // Default, could be enhanced
          segmentMatch: 50, // Default, could be enhanced
        })

        // Resolve linkedin URL from any column name variation
        const linkedinUrl = row.linkedinUrl || row.linkedin_url || row.linkedin || null

        // Create lead
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
            linkedinUrl,
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
      {
        imported,
        duplicates,
        errors,
        total: rows.length,
        summary: `Imported ${imported} leads, skipped ${duplicates} duplicates, ${errors.length} errors`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to import leads:', error)
    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 }
    )
  }
}
