import { NextResponse } from 'next/server'
import { buscarDisponibilidade, isAgendaConfigurada } from '@/lib/agenda'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Horários livres na agenda do Marcelo, conferidos na hora. Usado pela caixa de
// respostas: a sugestão da IA foi escrita quando a resposta chegou, e o SDR pode
// estar respondendo horas depois — aqui os horários são sempre de agora.
export async function GET() {
  // Sem iCal ainda existe o espelho gravado no banco, então quem decide é o
  // buscarDisponibilidade — desistir aqui fazia a tela dizer "agenda não
  // conectada" mesmo com horários disponíveis.
  const d = await buscarDisponibilidade()

  const aviso =
    d.fonte === 'nao-configurada'
      ? isAgendaConfigurada()
        ? ''
        : 'Agenda não conectada: nem o iCal nem o espelho estão disponíveis.'
      : d.fonte === 'espelho' && d.horarios.length === 0
        ? `Agenda conferida há ${Math.round(d.idadeHoras ?? 0)}h — desatualizada demais para sugerir horário. Peça ao Claude para atualizar o espelho.`
        : d.fonte === 'falhou'
          ? 'Não consegui ler a agenda agora.'
          : ''

  return NextResponse.json({
    horarios: d.horarios,
    fonte: d.fonte,
    consultadaEm: d.consultadaEm,
    idadeHoras: d.idadeHoras,
    ...(aviso ? { aviso } : {}),
    ...(d.erro ? { erro: d.erro } : {}),
  })
}
