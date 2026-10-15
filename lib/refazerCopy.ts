// Devolve para a IA o texto que ela mesma escreveu junto da regra que ele
// violou, para que ela corrija. Quem escorregou foi o modelo — a regra está no
// prompt de geração desde 31/08 —, então a conta da correção não deveria cair
// no SDR, que hoje reescreve à mão.
//
// A correção é CIRÚRGICA de propósito: na caixa de respostas o texto já passou
// pela edição humana, e reescrever tudo joga esse trabalho fora. No caso real do
// Gustavo Andrade Milhomem (Sicredi, 03/10) a correção certa era remover uma
// palavra de 611 caracteres, não produzir outra mensagem.
import { Anthropic } from '@anthropic-ai/sdk'
import { violacoesEmTexto, type Violacao } from './auditoriaClaims'

export interface Refeito {
  texto: string
  violacoesRestantes: Violacao[]
  mudou: boolean
}

const REGRAS_EXPLICADAS: Record<string, string> = {
  CASE: 'Alegou case, cliente ou experiência em um setor que a MasterVendas não tem. Faltando case, diga que falta e peça o contexto do lead.',
  NUMERO: 'Prometeu número de resultado (percentual de ganho, horas economizadas, prazo de implantação). Não prometa números.',
  AUTOMACAO:
    'Descreveu a DAISEE como automação. Ela é IA privada de gestão documental: repositório criptografado, OCR, indexação, chat sobre o acervo citando a fonte, comparação de versões. Não automatiza workflow nem monitora risco.',
  REPERTORIO:
    'Apresentou repertório que a MasterVendas não acumulou ("o que costuma funcionar nesses casos", "vejo com frequência", "na maioria das vezes"). Em vez de receita pronta, faça pergunta.',
  AUTORIA:
    'Tratou a MasterVendas como desenvolvedora da DAISEE. Ela é PARCEIRA: use "somos parceiros da DAISEE" ou "trabalho com a DAISEE", nunca "desenvolvemos" ou "nossa IA".',
  INTENCAO:
    'Declarou a intenção para negá-la ("sem segunda intenção", "não quero te vender nada", "sem compromisso"). É afirmação falsa e o lead sabe. Para falar de duração, diga a duração ("leva 15 minutos").',
}

/**
 * Pede à IA a menor correção que limpa as violações e reaudita o resultado.
 * Devolve o texto original quando a correção falha ou piora — nunca devolve
 * algo pior do que entrou.
 */
export async function corrigirComCritica(texto: string, violacoes: Violacao[]): Promise<Refeito> {
  if (!violacoes.length) return { texto, violacoesRestantes: [], mudou: false }

  const criticas = violacoes
    .map((v) => `- Regra ${v.regra} (${v.rotulo})\n  Trecho acusado: "${v.trecho}"\n  Por quê: ${REGRAS_EXPLICADAS[v.regra] ?? v.rotulo}`)
    .join('\n')

  const prompt = `Você escreveu a mensagem abaixo para um lead da MasterVendas, e ela foi reprovada na auditoria de honestidade da copy.

MENSAGEM REPROVADA:
"""
${texto}
"""

O QUE A AUDITORIA ACUSOU:
${criticas}

Corrija a mensagem com a MENOR alteração possível:
- Mude apenas o que é necessário para eliminar a violação. Muitas vezes basta trocar ou remover uma palavra.
- Preserve o resto do texto exatamente como está: tom, estrutura, pergunta final, assinatura, quebras de linha.
- Não acrescente informação nova, não invente fato sobre o lead nem sobre a empresa dele.
- Não reescreva a mensagem inteira. Não mude o sentido do que está sendo perguntado.
- Mantenha o português impecável, com todos os acentos.
- Se a acusação não procede porque o sujeito da frase é a rotina do LEAD (e não a experiência da MasterVendas), ainda assim reformule para que a frase não dispare a regra, preservando a pergunta.

Responda com a mensagem corrigida e NADA MAIS — sem aspas em volta, sem comentário, sem explicação.`

  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const bruto = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  // O modelo às vezes devolve o texto entre aspas apesar da instrução.
  const corrigido = bruto.replace(/^["'`]+|["'`]+$/g, '').trim()

  if (!corrigido) return { texto, violacoesRestantes: violacoes, mudou: false }

  const restantes = violacoesEmTexto(corrigido)
  // Só aceita a correção se ela realmente melhorou. Devolver texto com MAIS
  // violações do que entrou seria trocar um problema conhecido por um pior.
  if (restantes.length >= violacoes.length) {
    return { texto, violacoesRestantes: violacoes, mudou: false }
  }

  return { texto: corrigido, violacoesRestantes: restantes, mudou: corrigido !== texto }
}
