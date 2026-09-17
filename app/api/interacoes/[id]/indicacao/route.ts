import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isUnipileConfigured } from '@/lib/unipile'
import {
  buscarCandidatos,
  cadastrarIndicacao,
  empresaIdDoIndicador,
  extrairIndicacao,
  IndicacaoError,
} from '@/lib/indicacao'
import { mesmaEmpresa } from '@/lib/qualificacaoPreparo'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Quando o lead indica outra pessoa. GET lê a indicação na mensagem e busca os
// perfis candidatos; POST cadastra o escolhido e arquiva a conversa. Nada é
// enviado a ninguém por aqui.
//
// GET ?nome=&empresa= refaz só a busca com o que o SDR corrigiu, sem chamar a IA.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isUnipileConfigured()) {
      return NextResponse.json({ error: 'Unipile não configurada.' }, { status: 503 })
    }
    const interacao = await prisma.interacao.findUnique({ where: { id: params.id }, include: { lead: true } })
    if (!interacao) return NextResponse.json({ error: 'Interação não encontrada.' }, { status: 404 })

    const nomeManual = request.nextUrl.searchParams.get('nome')?.trim()
    const empresaManual = request.nextUrl.searchParams.get('empresa')?.trim()

    const indicacao = nomeManual
      ? { nome: nomeManual, empresa: empresaManual || interacao.lead.company, cargo: null, assunto: null }
      : await extrairIndicacao({ mensagem: interacao.mensagem, indicador: interacao.lead })

    if (!indicacao) {
      return NextResponse.json({
        indicacao: null,
        candidatos: [],
        empresaPadrao: interacao.lead.company,
        aviso: 'Não achei um nome de pessoa indicada nesta mensagem. Digite o nome para buscar.',
      })
    }

    // O filtro pela empresa de quem indicou só vale se a busca é nessa empresa:
    // o SDR pode ter corrigido para outra.
    const companyId = mesmaEmpresa(indicacao.empresa, interacao.lead.company)
      ? await empresaIdDoIndicador(interacao.lead)
      : null
    const candidatos = await buscarCandidatos(indicacao.nome, indicacao.empresa, companyId)
    return NextResponse.json({
      indicacao,
      candidatos,
      empresaPadrao: interacao.lead.company,
      filtrouPelaEmpresa: Boolean(companyId),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Falha ao buscar indicação:', msg)
    return NextResponse.json({ error: `Falha ao buscar: ${msg}` }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const nome = String(body?.nome ?? '').trim()
    const empresa = String(body?.empresa ?? '').trim()
    if (!nome || !empresa) {
      return NextResponse.json({ error: 'Informe nome e empresa da pessoa indicada.' }, { status: 400 })
    }

    const resultado = await cadastrarIndicacao({
      interacaoId: params.id,
      providerId: body?.providerId ?? null,
      url: body?.url ?? null,
      nome,
      empresa,
      cargo: body?.cargo ?? null,
      assunto: body?.assunto ?? null,
    })
    return NextResponse.json(resultado, { status: resultado.jaExistia ? 200 : 201 })
  } catch (error) {
    if (error instanceof IndicacaoError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Falha ao cadastrar indicação:', msg)
    return NextResponse.json({ error: `Falha ao cadastrar: ${msg}` }, { status: 500 })
  }
}
