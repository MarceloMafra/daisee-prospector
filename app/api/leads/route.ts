import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { etapaDoLead, motivoEncerramento } from '@/lib/etapaFunil'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(1000, parseInt(searchParams.get('limit') || '10'))
    const skip = (page - 1) * limit

    // Filters
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    // Opt-in: o Funil de Vendas pede a etapa calculada; as outras telas não pagam o custo.
    const comEtapa = searchParams.get('etapa') === '1'

    // Ordenação pedida pela tela (lista branca: nunca repassar texto livre ao Prisma).
    const dir: 'asc' | 'desc' = searchParams.get('dir') === 'asc' ? 'asc' : 'desc'
    const sort = searchParams.get('sort') || 'createdAt'
    const orderBy: any[] =
      sort === 'email'
        // com e-mail primeiro (asc) ou sem e-mail primeiro (desc)
        ? [{ email: { sort: dir, nulls: dir === 'asc' ? 'last' : 'first' } }, { createdAt: 'desc' }]
        : ['name', 'company', 'daiseeScore', 'status', 'createdAt'].includes(sort)
          ? [{ [sort]: dir }, { id: 'asc' }]
          : [{ createdAt: 'desc' }]
    const filtroEmail = searchParams.get('email') // 'com' | 'sem'
    const minScore = parseFloat(searchParams.get('minScore') || '0')
    const maxScore = parseFloat(searchParams.get('maxScore') || '100')

    // Build where clause
    const where: any = {
      daiseeScore: {
        gte: minScore,
        lte: maxScore,
      },
    }

    if (search) {
      // "cambio" precisa achar "OZ Câmbio": quem digita o nome de um lead
      // brasileiro raramente põe o acento, e o `contains` do Prisma compara
      // byte a byte — o acento fazia a busca devolver zero e o operador
      // concluía que o lead não estava na base.
      //
      // unaccent() não existe no Prisma, então a comparação vai em SQL e
      // devolve só os ids; o resto da consulta (score, status, prioridade,
      // ordenação, paginação) continua no Prisma. Traz todos os ids que casam,
      // o que é adequado a uma base de prospecção — se um dia forem centenas
      // de milhares, a busca inteira tem que descer para SQL.
      // Sem escapar, "50%" viraria curinga e traria qualquer coisa com "50".
      const termo = `%${search.replace(/[\\%_]/g, c => `\\${c}`)}%`

      const casam = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Lead"
        WHERE unaccent(name) ILIKE unaccent(${termo})
           OR unaccent(coalesce(email, '')) ILIKE unaccent(${termo})
           OR unaccent(company) ILIKE unaccent(${termo})
      `
      where.id = { in: casam.map(l => l.id) }
    }

    if (status) {
      where.status = status
    }

    if (filtroEmail === 'com') where.email = { not: null }
    if (filtroEmail === 'sem') where.email = null

    if (priority) {
      where.priority = priority
    }

    // Get total count
    const total = await prisma.lead.count({ where })

    // Get leads
    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        seniority: true,
        daiseeScore: true,
        status: true,
        priority: true,
        excludedFromAutomation: true,
        createdAt: true,
        updatedAt: true,
        ...(comEtapa && {
          linkedinConnectedAt: true,
          _count: { select: { interacoes: true } },
          cadencia: {
            select: { touches: { select: { type: true, status: true, sentAt: true } } },
          },
        }),
      },
      orderBy,
      skip,
      take: limit,
    })

    const leadsSaida = comEtapa
      ? (leads as any[]).map(({ cadencia, _count, linkedinConnectedAt, ...l }) => ({
          ...l,
          etapa: etapaDoLead({
            status: l.status,
            linkedinConnectedAt,
            interacoes: _count?.interacoes ?? 0,
            touches: cadencia?.touches ?? [],
          }),
          motivoEncerramento: motivoEncerramento(l.status),
        }))
      : leads

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json(
      {
        leads: leadsSaida,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

// Cria um lead. Serve tanto ao cadastro manual do painel quanto a chamadas diretas.
//
// Só nome, empresa e cargo são obrigatórios: um contato que aparece no meio de uma
// conversa raramente vem com e-mail, e o LinkedIn costuma bastar para abrir o canal.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const name = String(body.name ?? '').trim()
    const company = String(body.company ?? '').trim()
    const seniority = String(body.seniority ?? '').trim()
    const email = String(body.email ?? '').trim() || null
    const phone = String(body.phone ?? '').trim() || null
    const linkedinUrl = String(body.linkedinUrl ?? '').trim() || null
    const notes = String(body.notes ?? '').trim() || null

    if (!name || !company || !seniority) {
      return NextResponse.json(
        { error: 'Informe pelo menos nome, empresa e cargo.' },
        { status: 400 }
      )
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
      }

      const existing = await prisma.lead.findUnique({ where: { email } })
      if (existing) {
        return NextResponse.json(
          { error: `Já existe um lead com esse e-mail: ${existing.name} (${existing.company}).` },
          { status: 409 }
        )
      }
    }

    // Sem e-mail não há chave única, então avisamos sobre o homônimo na mesma
    // empresa em vez de barrar — pode ser cadastro repetido, pode ser xará.
    const homonimo = !email
      ? await prisma.lead.findFirst({ where: { name, company } })
      : null

    const { calculateDAISEEScore } = await import('@/lib/daisee-score')

    const scoreResult = calculateDAISEEScore({
      seniority,
      companySize: body.companySize || 'MEDIA',
      segmentMatch: body.segmentMatch ?? 50,
    })

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        company,
        seniority,
        phone,
        linkedinUrl,
        profileUrl: linkedinUrl,
        notes,
        daiseeScore: scoreResult.score,
        decisionPower: scoreResult.decisionPower,
        companySize: body.companySize || 'MEDIA',
        segmentMatch: scoreResult.segmentMatch,
        status: 'PROSPECTANDO',
        priority: scoreResult.score >= 80 ? 'ALTA' : scoreResult.score >= 50 ? 'MEDIA' : 'BAIXA',
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        daiseeScore: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        leadId: lead.id,
        action: 'LEAD_CRIADO_MANUALMENTE',
        details: `Cadastro digitado no painel. Cargo: ${seniority}. Canais: ${[
          email && 'e-mail',
          phone && 'telefone',
          linkedinUrl && 'LinkedIn',
        ]
          .filter(Boolean)
          .join(', ') || 'nenhum informado'}.`,
      },
    })

    return NextResponse.json(
      {
        ...lead,
        aviso: homonimo
          ? `Já havia um lead com o mesmo nome nessa empresa (cadastrado em ${homonimo.createdAt.toLocaleDateString('pt-BR')}). Confira se não é duplicado.`
          : undefined,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create lead:', error)
    return NextResponse.json(
      { error: 'Falha ao criar o lead.' },
      { status: 500 }
    )
  }
}
