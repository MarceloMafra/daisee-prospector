import { NextResponse } from 'next/server'
import { buscarDisponibilidade, isAgendaConfigurada } from '@/lib/agenda'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Horários livres na agenda do Marcelo, conferidos na hora. Usado pela caixa de
// respostas: a sugestão da IA foi escrita quando a resposta chegou, e o SDR pode
// estar respondendo horas depois — aqui os horários são sempre de agora.
export async function GET() {
  if (!isAgendaConfigurada()) {
    return NextResponse.json({
      horarios: [],
      fonte: 'nao-configurada',
      aviso: 'Agenda não conectada. Cole o endereço secreto em iCal do Google Agenda em GOOGLE_CALENDAR_ICS_URL.',
    })
  }

  const d = await buscarDisponibilidade()
  return NextResponse.json({
    horarios: d.horarios,
    fonte: d.fonte,
    consultadaEm: d.consultadaEm,
    ...(d.erro ? { erro: d.erro } : {}),
  })
}
