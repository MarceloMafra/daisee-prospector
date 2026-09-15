// Pipeline automático: enriquecer via LinkedIn + gerar cadência, para leads
// que não estão excluídos da automação (Lead.excludedFromAutomation = false).
// Roda antes do scheduler de envio (lib/scheduler.ts) na mesma execução do cron.
//
// Aplica a mesma qualificação do bulk-prepare (lib/qualificacaoPreparo.ts):
// ordem pelos pontos da triagem, sem empregador fica de fora, e o perfil
// enriquecido é conferido antes da cadência.
import { prisma } from '@/lib/prisma'
import { enrichLeadFromLinkedIn } from '@/lib/enrichment'
import { ensureCadenciaGenerated } from '@/lib/cadenciaGeneration'
import { isUnipileConfigured } from '@/lib/unipile'
import { bloquearPreparo, motivoBloqueioPosEnriquecimento, selecionarParaPreparo } from '@/lib/qualificacaoPreparo'

interface PipelineLimits {
  maxEnrichPerRun: number
  maxCadenciaGenPerRun: number
}

function getPipelineLimits(): PipelineLimits {
  return {
    maxEnrichPerRun: Number(process.env.MAX_ENRICH_PER_RUN || 5),
    maxCadenciaGenPerRun: Number(process.env.MAX_CADENCIA_GEN_PER_RUN || 5),
  }
}

interface StageAction {
  leadId: string
  leadName: string
  outcome: 'concluido' | 'falhou' | 'simulado' | 'bloqueado'
  reason?: string
}

export interface AutoPipelineResult {
  dryRun: boolean
  processedAt: string
  enrichment: { candidates: number; actions: StageAction[] }
  cadenciaGeneration: { candidates: number; actions: StageAction[] }
}

async function logAudit(leadId: string, action: string, details: string) {
  await prisma.auditLog.create({ data: { leadId, action, details } })
}

async function runEnrichmentStage(dryRun: boolean, limit: number) {
  const actions: StageAction[] = []

  if (!isUnipileConfigured()) {
    return { candidates: 0, actions }
  }

  // Sem perfil, e não "sem linkedinProviderId": lead do Sales Navigator já chega
  // com um provider_id (o URN ACwAAA…) e nunca era enriquecido aqui — ia direto
  // para a cadência, sem perfil e sem conferência de cargo.
  const semPerfil = await prisma.lead.findMany({
    where: {
      excludedFromAutomation: false,
      profileText: null,
      linkedinUrl: { not: null },
      cadencia: { is: null },
    },
  })
  const candidates = selecionarParaPreparo(semPerfil).elegiveis.slice(0, limit)

  for (const lead of candidates) {
    if (dryRun) {
      actions.push({ leadId: lead.id, leadName: lead.name, outcome: 'simulado', reason: 'Enriqueceria via LinkedIn.' })
      continue
    }
    try {
      const enriched = await enrichLeadFromLinkedIn(lead, {})
      await logAudit(lead.id, 'AUTO_ENRICH_LINKEDIN', 'Enriquecido automaticamente pelo pipeline.')

      const bloqueio = motivoBloqueioPosEnriquecimento({
        empresaNaLista: lead.company,
        empresaNoPerfil: (enriched.fieldsToUpdate.company as string | undefined) ?? lead.company,
        profileText: enriched.profileText,
      })
      if (bloqueio) {
        await bloquearPreparo(lead.id, bloqueio)
        actions.push({ leadId: lead.id, leadName: lead.name, outcome: 'bloqueado', reason: bloqueio })
        continue
      }
      actions.push({ leadId: lead.id, leadName: lead.name, outcome: 'concluido' })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      await logAudit(lead.id, 'AUTO_ENRICH_FALHOU', reason)
      actions.push({ leadId: lead.id, leadName: lead.name, outcome: 'falhou', reason })
    }
  }

  return { candidates: candidates.length, actions }
}

async function runCadenciaGenerationStage(dryRun: boolean, limit: number) {
  const actions: StageAction[] = []

  // Só quem já tem perfil: a cadência sem perfil sai genérica, e sem perfil não
  // há como conferir se a pessoa segue no cargo.
  const prontos = await prisma.lead.findMany({
    where: {
      excludedFromAutomation: false,
      profileText: { not: null },
      linkedinProviderId: { not: null },
      cadencia: { is: null },
    },
  })
  const candidates = selecionarParaPreparo(prontos).elegiveis.slice(0, limit)

  for (const lead of candidates) {
    if (dryRun) {
      actions.push({ leadId: lead.id, leadName: lead.name, outcome: 'simulado', reason: 'Geraria cadência (5 touches).' })
      continue
    }
    try {
      // Enriquecido antes desta trava existir (ou à mão): confere o cargo atual.
      const bloqueio = motivoBloqueioPosEnriquecimento({
        empresaNaLista: lead.company,
        empresaNoPerfil: lead.company,
        profileText: lead.profileText,
      })
      if (bloqueio) {
        await bloquearPreparo(lead.id, bloqueio)
        actions.push({ leadId: lead.id, leadName: lead.name, outcome: 'bloqueado', reason: bloqueio })
        continue
      }
      await ensureCadenciaGenerated(lead.id)
      await logAudit(lead.id, 'AUTO_CADENCIA_GERADA', 'Cadência gerada automaticamente pelo pipeline.')
      actions.push({ leadId: lead.id, leadName: lead.name, outcome: 'concluido' })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      await logAudit(lead.id, 'AUTO_CADENCIA_FALHOU', reason)
      actions.push({ leadId: lead.id, leadName: lead.name, outcome: 'falhou', reason })
    }
  }

  return { candidates: candidates.length, actions }
}

export async function processAutoPipeline({ dryRun }: { dryRun: boolean }): Promise<AutoPipelineResult> {
  const limits = getPipelineLimits()

  const enrichment = await runEnrichmentStage(dryRun, limits.maxEnrichPerRun)
  // Reconsulta depois do enriquecimento — um lead enriquecido agora já pode
  // entrar na geração de cadência no mesmo ciclo (dry-run não altera dados,
  // então o estágio seguinte roda sobre a mesma base).
  const cadenciaGeneration = await runCadenciaGenerationStage(dryRun, limits.maxCadenciaGenPerRun)

  return {
    dryRun,
    processedAt: new Date().toISOString(),
    enrichment,
    cadenciaGeneration,
  }
}
