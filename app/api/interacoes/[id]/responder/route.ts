import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendLinkedInDM, isUnipileConfigured } from '@/lib/unipile'
import { violacoesEmTexto } from '@/lib/auditoriaClaims'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Responde o lead direto da caixa de entrada, sem abrir o LinkedIn nem a ficha.
// O texto vem do corpo — a sugestão da IA chega editada pelo SDR, nunca é enviada
// sozinha. Em caso de sucesso a interação vira RESPONDIDA na mesma transação
// lógica, para a resposta não sumir da caixa sem ter saído.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const texto = typeof body?.texto === 'string' ? body.texto.trim() : ''

    if (!texto) {
      return NextResponse.json({ error: 'Escreva a resposta antes de enviar.' }, { status: 400 })
    }

    const interacao = await prisma.interacao.findUnique({
      where: { id: params.id },
      include: { lead: true },
    })

    if (!interacao) {
      return NextResponse.json({ error: 'Interação não encontrada.' }, { status: 404 })
    }
    if (interacao.canal !== 'LINKEDIN') {
      return NextResponse.json(
        { error: `Só dá para responder por aqui no LinkedIn. Esta veio por ${interacao.canal}.` },
        { status: 400 }
      )
    }
    if (!interacao.lead.linkedinProviderId) {
      return NextResponse.json(
        { error: 'O lead não tem o id do LinkedIn gravado — responda pela conversa.' },
        { status: 400 }
      )
    }
    if (!isUnipileConfigured()) {
      return NextResponse.json({ error: 'Unipile não configurada.' }, { status: 503 })
    }

    // As regras de honestidade valem para o que sai daqui como valem para a
    // cadência. O SDR pode ter editado a sugestão e reintroduzido uma frase
    // proibida — melhor barrar antes de a mensagem chegar ao lead.
    const violacoes = violacoesEmTexto(texto)
    if (violacoes.length && !body?.ignorarAuditoria) {
      return NextResponse.json(
        {
          error: 'A resposta não passou na auditoria de copy.',
          violacoes: violacoes.map((v) => ({ regra: v.regra, rotulo: v.rotulo, trecho: v.trecho })),
        },
        { status: 422 }
      )
    }

    const enviado = await sendLinkedInDM({
      providerId: interacao.lead.linkedinProviderId,
      text: texto,
    })

    const atualizada = await prisma.interacao.update({
      where: { id: params.id },
      data: { status: 'RESPONDIDA' },
    })

    await prisma.auditLog.create({
      data: {
        leadId: interacao.leadId,
        action: 'RESPOSTA_ENVIADA',
        details: `Resposta enviada pelo painel (${texto.length} caracteres).${
          enviado.message_id ? ` message_id: ${enviado.message_id}.` : ''
        }`,
      },
    })

    return NextResponse.json({ interacao: atualizada, messageId: enviado.message_id }, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Falha ao responder interação:', msg)
    return NextResponse.json({ error: `Falha ao enviar: ${msg}` }, { status: 500 })
  }
}
