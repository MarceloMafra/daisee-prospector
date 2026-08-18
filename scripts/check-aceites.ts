// Polling de aceites de convite LinkedIn: varre as conexões de 1º grau na Unipile
// e preenche lead.linkedinConnectedAt pros leads com convite (T1) enviado que ainda
// constam como "aguardando". Cobre o gap do webhook (a Unipile não garante evento
// em tempo real de new_relation — o handler atual só trata message/mail).
//
// Read-only na Unipile; no banco só preenche linkedinConnectedAt + auditLog.
// Nada é enviado por aqui. Idempotente — pode rodar quantas vezes quiser.
//
// Uso:
//   npx dotenv -e .env.local -- npx tsx scripts/check-aceites.ts            (atualiza)
//   npx dotenv -e .env.local -- npx tsx scripts/check-aceites.ts --dry-run  (só relatório)
import { prisma } from '../lib/prisma'
import { notifySdr } from '../lib/notifySdr'

interface RelationItem {
  member_id?: string
  provider_id?: string
  created_at?: number // epoch ms
  first_name?: string
  last_name?: string
}

async function fetchAllRelations(): Promise<Map<string, RelationItem>> {
  const baseUrl = (process.env.UNIPILE_BASE_URL || '').replace(/\/$/, '')
  const accountId = process.env.UNIPILE_ACCOUNT_ID || ''
  if (!baseUrl || !process.env.UNIPILE_API_KEY || !accountId) {
    throw new Error('Unipile não configurada (UNIPILE_BASE_URL, UNIPILE_API_KEY, UNIPILE_ACCOUNT_ID)')
  }

  const byId = new Map<string, RelationItem>()
  let cursor: string | null = null
  do {
    const query = new URLSearchParams({ account_id: accountId, limit: '100' })
    if (cursor) query.set('cursor', cursor)
    const response = await fetch(`${baseUrl}/users/relations?${query.toString()}`, {
      headers: { 'X-API-KEY': process.env.UNIPILE_API_KEY || '', Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`Unipile /users/relations falhou: HTTP ${response.status}`)
    const data = (await response.json()) as { items?: RelationItem[]; cursor?: string | null }
    for (const item of data.items || []) {
      const id = item.member_id || item.provider_id
      if (id) byId.set(id, item)
    }
    cursor = data.cursor || null
  } while (cursor)

  return byId
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const relations = await fetchAllRelations()
  console.log(`Conexões de 1º grau na Unipile: ${relations.size}`)

  // Leads com convite (T1 LinkedIn) enviado e aceite ainda não registrado.
  const waiting = await prisma.lead.findMany({
    where: {
      linkedinConnectedAt: null,
      linkedinProviderId: { not: null },
      cadencia: { touches: { some: { sequence: 1, channel: 'LINKEDIN', status: { in: ['ENVIADO', 'ENTREGUE', 'RESPONDIDO'] } } } },
    },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`Leads com convite enviado aguardando aceite no banco: ${waiting.length}\n`)

  let updated = 0
  for (const lead of waiting) {
    const relation = relations.get(lead.linkedinProviderId!)
    if (!relation) {
      console.log(`- ${lead.name} (${lead.company ?? '?'}): ainda aguardando`)
      continue
    }
    const when = relation.created_at ? new Date(relation.created_at) : new Date()
    if (dryRun) {
      console.log(`✔ ${lead.name}: ACEITOU (conexão em ${when.toISOString().slice(0, 16)}) — dry-run, sem gravar`)
      continue
    }
    await prisma.lead.update({ where: { id: lead.id }, data: { linkedinConnectedAt: when } })
    await prisma.auditLog.create({
      data: {
        leadId: lead.id,
        action: 'CONEXAO_ACEITA',
        details: `Aceite de convite detectado via polling Unipile (/users/relations). Conexão criada em ${when.toISOString()}. T2 (DM) liberado.`,
      },
    })
    updated++
    console.log(`✔ ${lead.name}: ACEITOU (conexão em ${when.toISOString().slice(0, 16)}) — linkedinConnectedAt preenchido`)

    const notified = await notifySdr({
      leadId: lead.id,
      leadName: lead.name,
      company: lead.company,
      event: 'CONEXAO_ACEITA',
      linkedinUrl: lead.linkedinUrl,
    })
    if (notified.live) console.log(`  ${notified.ok ? '→ SDR notificado por WhatsApp' : '→ FALHA ao notificar SDR (ver log acima)'}`)
  }

  console.log(`\nResumo: ${updated} aceite(s) novo(s) registrado(s); ${waiting.length - updated} aguardando.`)
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
