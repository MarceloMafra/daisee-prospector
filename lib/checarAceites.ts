// Detecta aceites de convite no LinkedIn e preenche linkedinConnectedAt.
// Existe porque o webhook da Unipile não emite evento de nova conexão — a
// única forma confiável é comparar a lista de relações de 1º grau com os
// leads que têm convite enviado e ainda constam como aguardando.
//
// Usado pelo cron (junto com o monitor de interações) e pelo script
// scripts/check-aceites.ts.
import { prisma } from '@/lib/prisma'
import { listRelations } from '@/lib/unipile'
import { notifySdr } from '@/lib/notifySdr'

export interface AceitesResult {
  relacoes: number
  aguardando: number
  novosAceites: Array<{ lead: string; company: string; conectadoEm: string }>
}

export async function checarAceites(opts: { dryRun?: boolean } = {}): Promise<AceitesResult> {
  const { dryRun = false } = opts
  const relations = await listRelations()

  const aguardando = await prisma.lead.findMany({
    where: {
      linkedinConnectedAt: null,
      linkedinProviderId: { not: null },
      cadencia: {
        touches: {
          some: {
            sequence: 1,
            channel: 'LINKEDIN',
            status: { in: ['ENVIADO', 'ENTREGUE', 'RESPONDIDO'] },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const result: AceitesResult = {
    relacoes: relations.size,
    aguardando: aguardando.length,
    novosAceites: [],
  }

  for (const lead of aguardando) {
    const relation = relations.get(lead.linkedinProviderId!)
    if (!relation) continue

    const when = relation.created_at ? new Date(relation.created_at) : new Date()
    result.novosAceites.push({
      lead: lead.name,
      company: lead.company,
      conectadoEm: when.toISOString(),
    })
    if (dryRun) continue

    await prisma.lead.update({ where: { id: lead.id }, data: { linkedinConnectedAt: when } })
    await prisma.auditLog.create({
      data: {
        leadId: lead.id,
        action: 'CONEXAO_ACEITA',
        details: `Aceite detectado via polling Unipile (/users/relations). Conexão criada em ${when.toISOString()}. T2 (DM) liberado.`,
      },
    })
    await notifySdr({
      leadId: lead.id,
      leadName: lead.name,
      company: lead.company,
      event: 'CONEXAO_ACEITA',
      linkedinUrl: lead.linkedinUrl,
    })
  }

  return result
}
