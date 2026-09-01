// Teste real da notificação de WhatsApp pro SDR: envia uma mensagem de exemplo
// para o número configurado em SDR_WHATSAPP_NUMBER, usando o canal do Masterbot.
// Serve para validar MASTERBOT_NOTIFICA_UUID / MASTERBOT_NOTIFICA_TOKEN antes
// de depender delas no cron e no webhook.
//
// Uso: npx dotenv -e .env.local -- npx tsx scripts/testar-notificacao.ts
import { prisma } from '../lib/prisma'
import { notifySdr } from '../lib/notifySdr'

async function main() {
  // mesmo saneamento do notifySdr: BOM colado do painel da Vercel ja invalidou o UUID
  const uuid = (process.env.MASTERBOT_NOTIFICA_UUID || '').replace(/^\uFEFF/, '').trim()
  const token = (process.env.MASTERBOT_NOTIFICA_TOKEN || '').replace(/^\uFEFF/, '').trim()
  const numero = process.env.SDR_WHATSAPP_NUMBER || ''

  console.log('Conferindo configuração:')
  console.log(`  MASTERBOT_NOTIFICA_UUID .... ${uuid ? uuid : '✗ AUSENTE'}`)
  console.log(`  MASTERBOT_NOTIFICA_TOKEN ... ${token ? `✓ definido (${token.length} chars, começa com "${token.slice(0, 6)}…")` : '✗ AUSENTE'}`)
  console.log(`  SDR_WHATSAPP_NUMBER ........ ${numero ? numero : '✗ AUSENTE'}`)
  console.log(`  SDR_NAME ................... ${process.env.SDR_NAME || '(padrão: João)'}`)

  if (!uuid || !token || !numero) {
    console.log('\n✗ Faltam variáveis no .env.local — a notificação seria suprimida.')
    process.exitCode = 1
    return
  }

  // Usa um lead real só para o audit log ficar coerente; nada é enviado ao lead.
  const lead = await prisma.lead.findFirst({
    where: { linkedinConnectedAt: { not: null } },
    orderBy: { linkedinConnectedAt: 'desc' },
  })
  if (!lead) {
    console.log('\n✗ Nenhum lead conectado encontrado para montar o teste.')
    process.exitCode = 1
    return
  }

  console.log(`\nEnviando notificação de teste para ${numero} (usando o lead ${lead.name})...`)
  const r = await notifySdr({
    leadId: lead.id,
    leadName: lead.name,
    company: lead.company,
    event: 'CONEXAO_ACEITA',
    detail: 'MENSAGEM DE TESTE — disparada manualmente para validar a integração. Nenhuma ação é necessária.',
    linkedinUrl: lead.linkedinUrl,
  })

  if (r.ok && r.live) {
    console.log('\n✔ Enviada com sucesso. Confira o WhatsApp do destinatário.')
  } else if (!r.live) {
    console.log('\n✗ Notificação suprimida — variáveis ausentes.')
    process.exitCode = 1
  } else {
    console.log('\n✗ Falha no envio — veja o erro acima (token inválido, canal desconectado ou número em formato errado).')
    process.exitCode = 1
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
