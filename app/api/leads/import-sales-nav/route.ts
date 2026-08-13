import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDAISEEScore } from '@/lib/daisee-score'
import {
  UnipileError,
  isUnipileConfigured,
  fetchAllSalesNavLeadListMembers,
  getSalesNavFullName,
} from '@/lib/unipile'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    if (!isUnipileConfigured()) {
      return NextResponse.json(
        { error: 'Integração Unipile não configurada (UNIPILE_BASE_URL, UNIPILE_API_KEY, UNIPILE_ACCOUNT_ID).' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const listId: string | undefined = body.listId
    const listName: string | undefined = body.listName

    if (!listId) {
      return NextResponse.json({ error: 'listId é obrigatório (ID da lista salva no Sales Navigator).' }, { status: 400 })
    }

    const members = await fetchAllSalesNavLeadListMembers(listId)

    let imported = 0
    let duplicates = 0
    let skipped = 0
    const errors: Array<{ name: string; error: string }> = []

    for (const item of members) {
      const linkedinProviderId = item.id
      const name = getSalesNavFullName(item)

      if (!linkedinProviderId || !name) {
        skipped++
        errors.push({ name: name || 'N/A', error: 'Registro sem id ou nome — não foi possível importar.' })
        continue
      }

      try {
        const existing = await prisma.lead.findFirst({ where: { linkedinProviderId } })
        if (existing) {
          duplicates++
          continue
        }

        const currentPosition = item.current_positions?.[0]
        const company = currentPosition?.company?.trim() || 'Não informado'
        const seniority = currentPosition?.role?.trim() || item.headline?.trim() || 'Não informado'
        const linkedinUrl = item.public_profile_url || null

        const scoreResult = calculateDAISEEScore({
          seniority,
          companySize: 'MEDIA',
          segmentMatch: 50,
        })

        const noteParts = [
          `Importado do Sales Navigator${listName ? ` (lista "${listName}")` : ''}.`,
          item.headline ? `Headline: ${item.headline}` : null,
          item.location ? `Localização: ${item.location}` : null,
          item.recently_hired ? 'Sinalizado como recém-contratado(a) pelo filtro do Sales Navigator.' : null,
        ].filter(Boolean)

        await prisma.lead.create({
          data: {
            name,
            company,
            seniority,
            email: null,
            linkedinUrl,
            linkedinProviderId,
            notes: noteParts.join('\n'),
            daiseeScore: scoreResult.score,
            decisionPower: scoreResult.decisionPower,
            companySize: 'MEDIA',
            segmentMatch: scoreResult.segmentMatch,
            status: 'PROSPECTANDO',
            priority: scoreResult.score >= 80 ? 'ALTA' : scoreResult.score >= 50 ? 'MEDIA' : 'BAIXA',
          },
        })

        imported++
      } catch (err) {
        errors.push({ name, error: err instanceof Error ? err.message : 'Erro desconhecido' })
      }
    }

    return NextResponse.json(
      {
        imported,
        duplicates,
        skipped,
        total: members.length,
        errors,
        summary: `Importados ${imported} leads, ${duplicates} já existiam, ${skipped} pulados, ${errors.length} erros.`,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof UnipileError) {
      return NextResponse.json(
        { error: `Falha na comunicação com a Unipile: ${error.message}` },
        { status: error.status === 401 || error.status === 403 ? 502 : error.status }
      )
    }
    console.error('Falha ao importar leads do Sales Navigator:', error)
    return NextResponse.json({ error: 'Falha ao importar leads do Sales Navigator' }, { status: 500 })
  }
}
