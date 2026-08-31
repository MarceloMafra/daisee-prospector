// Regras de auditoria dos touches já gravados no banco, espelhando as REGRAS DE
// HONESTIDADE do prompt em lib/claude.ts. Servem para achar as cadências geradas
// antes dessas regras existirem — e para conferir depois que a limpeza funcionou.
//
// É detecção por texto: aponta o que precisa de leitura humana, não julga sozinha.

export type RegraId = 'CASE' | 'NUMERO' | 'AUTOMACAO' | 'REPERTORIO' | 'AUTORIA' | 'INTENCAO'

export interface Violacao {
  regra: RegraId
  rotulo: string
  trecho: string
}

const REGRAS: { id: RegraId; rotulo: string; re: RegExp }[] = [
  {
    id: 'CASE',
    rotulo: 'case/experiência em setor',
    // A oração subordinada ("os bancos estrangeiros QUE ATENDEMOS aqui") diz a mesma
    // coisa que "temos ajudado bancos" e passava batido na versão anterior.
    re: /\b(temos ajudad\w*|temos apoiad\w*|venho ajudand\w*|ajudamos \w+ (empresas|líderes|lideres|áreas|areas|times|gestores|bancos)|outros clientes|nossos clientes|clientes nossos|clientes d\w+ (mesmo )?(setor|segmento|área|area)|empresas d\w+ (setor|segmento)|casos? (parecid\w+|similar\w*)|já (ajudamos|apoiamos|atendemos)|que (atendemos|atendo|apoiamos|apoio|ajudamos|ajudo)\b|atendemos (aqui|hoje|no brasil)|(d|n)a nossa (carteira|base de clientes|experiência|experiencia)|em (empresas|bancos|instituições) como)\b/gi,
  },
  {
    id: 'REPERTORIO',
    rotulo: 'repertório/receita de casos que não existem',
    re: /\b(costuma\w* (funcionar|dar certo|resolver)|o que funciona nesses casos|n(a|as) maioria (das vezes|dos casos)|vejo (muito|sempre|com frequ[êe]ncia)|escuto (muito|com frequ[êe]ncia)|ou[çc]o (muito|com frequ[êe]ncia)|o padr[ãa]o que (a gente|n[óo]s) observ\w*|nesses casos,? o que)\b/gi,
  },
  {
    id: 'NUMERO',
    rotulo: 'número de resultado',
    // Promessa nao mora so em percentual: "recupera 20h/mes", "economiza 3
    // horas por semana" e "em 30 dias operacional" dizem a mesma coisa em outra
    // unidade. O kit de vendas de marco tinha nove dessas, todas invisiveis para
    // a versao anterior da regra.
    re: /(\b\d{1,3}(?:[.,]\d+)?\s?%|redu(z|zir|ção)\s+(em\s+)?(até\s+)?\d|economia de \d|ganho de \d|aumento de \d|\b\d{1,3}\s?h(oras)?\s?\/\s?(mês|semana|dia)|(recupera|economiza|poupa|ganha)\w*\s+(até\s+)?\d{1,3}\s?(h|horas|dias|semanas|minutos)|em\s+\d{1,3}\s+dias?\s+(operacional|no ar|rodando|implantad)|(operacional|no ar|rodando|implantad\w*)\s+em\s+\d{1,3}\s+dias?)/gi,
  },
  {
    id: 'AUTOMACAO',
    rotulo: 'DAISEE como automação',
    re: /\b(automa(ção|cao|tiza\w*|tizar|tizando)|robô|robo\b|chatbot|workflow|due diligence|monitora\w* de risco)\b/gi,
  },
  {
    id: 'INTENCAO',
    rotulo: 'declaracao de intencao (nega o interesse comercial)',
    // Regra do Marcelo, 31/08: "Eu tenho segunda intencao sim, e a pessoa do lado
    // de la sabe intuitivamente que sim." Negar o interesse comercial e uma
    // afirmacao falsa, e o lead percebe -- a legitimidade vem da pergunta agregar
    // valor, nao de jurar que nao ha venda no fim da conversa.
    re: /(sem segundas? inten[çc][ãa]?[oõ][ee]?s?\b|sem (nenhum |qualquer )?interesse comercial|sem (nenhuma |qualquer )?agenda (escondida|oculta)|sem compromisso (algum|nenhum)?|n[ãa]o (quero|vou|pretendo|estou|venho|vim)[^.!?]{0,30}\bvend|n[ãa]o estou (te )?vendendo|n[ãa]o (é|e) (um |uma )?(pitch|venda|tentativa de venda|abordagem comercial|abordagem de venda)|n[ãa]o (é|e) nada comercial|nada de (pitch|venda)|sem (querer )?(te )?vender nada|n[ãa]o vou (te )?(empurrar|insistir)|prometo que n[ãa]o (vou|é))/gi,
  },
  {
    id: 'AUTORIA',
    rotulo: 'MasterVendas como autora da DAISEE',
    // A MasterVendas e PARCEIRA da DAISEE, nao a desenvolvedora. Dizer o
    // contrario e verificavel em um clique -- e o publico da campanha
    // (compliance, auditoria, CFO) checa fornecedor por oficio.
    re: /(desenvolví|desenvolvi|desenvolvemos|desenvolveu|criamos|criei|construimos|construímos)[^.!?]{0,60}daisee|daisee[^.!?]{0,40}que (desenvolvemos|desenvolvi|criamos|criei|constru[íi]mos)\b|(desenvolvemos|desenvolvi|criamos|criei) uma ia[^.!?]{0,50}(documental|daisee)|nossa (ia|solução|ferramenta|plataforma) de gestão documental/gi,
  },
]

// O único número liberado é o depoimento da Dinamica Merchandising.
const EXCECAO_DEPOIMENTO = /din[âa]mica/i

// "Não é automação de processo" é a formulação CORRETA — o texto está negando,
// não prometendo. Sem isso a auditoria acusaria justamente as cadências limpas.
const NEGACAO = /\b(n[ãa]o|nada de|nem|sem ser|longe de|diferente de|ao contr[áa]rio de)\b[^.!?]{0,70}$/i

// "Sem automação de workflow, sem promessas genéricas" nega tanto quanto "não é automação",
// mas "sem" sozinho só vale para esta regra: em "reduza sem esforço em 40%" o
// "sem" não desmente o número, e liberar aí seria abrir buraco na regra NUMERO.
const NEGACAO_AUTOMACAO = /\bsem\b[^.!?]{0,70}$/i

// "relatórios de due diligence" é um TIPO DE DOCUMENTO que a DAISEE indexa —
// diferente de prometer que ela executa a due diligence.
const DOCUMENTO_DE = /(relat[óo]rios?|documentos?|evid[êe]ncias?|arquivos?|dossi[êe]s?|pareceres?|pol[íi]ticas?|contratos?)\s+(de|da|do)\s+$/i

// Falar da carreira do LEAD não é claim nosso: "sua experiência em empresas como
// Oi e Tupy", "liderou due diligence na DXA" descrevem a trajetória dele. Só vira
// violação quando o sujeito da frase somos nós.
const TRAJETORIA_DO_LEAD =
  /(sua (experi[êe]ncia|trajet[óo]ria|passagem|carreira|atua[çc][ãa]o|viv[êe]ncia|bagagem)|voc[êe] (\w+ou|liderou|esteve|j[áa]|manteve|fez|teve)|conselheir[oa]|quando (voc[êe]|ele|ela)|sua (rotina|[áa]rea|opera[çc][ãa]o|atua[çc][ãa]o|fun[çc][ãa]o|equipe|agenda)|no seu (time|trabalho)|no [A-Z]\w+, voc[êe])[^.!?]{0,120}$/i

// A frase toda em volta do match — a violação de AUTOMACAO depende de quem é o
// sujeito, e isso só dá pra ver no período inteiro, não nos 60 caracteres antes.
function fraseAoRedor(texto: string, index: number) {
  const ini = Math.max(0, texto.lastIndexOf('.', index - 1) + 1, texto.lastIndexOf('\n', index - 1) + 1)
  const fim = texto.slice(index).search(/[.!?\n]/)
  return texto.slice(ini, fim === -1 ? texto.length : index + fim)
}

// Quando a DAISEE (ou nós) é o sujeito, "automação" vira promessa do produto.
const SUJEITO_NOSSO =
  /\b(daisee|nossa? (solu[çc][ãa]o|plataforma|ferramenta|produto|ia)|a (plataforma|ferramenta)|n[óo]s\b|a gente)\b/i

// "automação de dossiês na Caju", "due diligence de parceiros", "automação de
// chamados no iFood": o sujeito é o lead ou a empresa dele. TRAJETORIA_DO_LEAD
// já cobria isso, mas só com verbo terminado em -ou ("você liderou") — "você
// coordena", "você construiu", "você trabalha" e "você descreveu" passavam
// batido e a auditoria acusava justamente os textos corretos.
const CONTEXTO_DO_LEAD =
  /\b(vi (que|no|em|sobre)|no seu perfil|seu (perfil|hist[óo]rico|trabalho|time|escopo|cargo|dia a dia)|voc[êe]|a empresa (tem|vem|est[áa]|j[áa])|na sua (rotina|[áa]rea|opera[çc][ãa]o))\b/i

export function violacoesEmTexto(texto: string): Violacao[] {
  const achados: Violacao[] = []

  for (const regra of REGRAS) {
    regra.re.lastIndex = 0
    let m: RegExpExecArray | null

    while ((m = regra.re.exec(texto)) !== null) {
      // O depoimento da Dinamica é o único caso liberado — e ele cita cliente
      // e número juntos, então libera as duas regras, não só a do número.
      if ((regra.id === 'NUMERO' || regra.id === 'CASE') && EXCECAO_DEPOIMENTO.test(texto)) continue

      // "concordo 100%", "migração 100% pra cloud", "dados 100% em infra própria":
      // 100% nunca é promessa de eficiência plausível, é reforço de linguagem.
      // Só conta se vier junto de verbo de ganho ou redução.
      if (regra.id === 'NUMERO' && /^100\s?%$/.test(m[0].trim())) {
        const contexto = texto.slice(Math.max(0, m.index - 50), m.index)
        if (!/(redu|econom|ganho|aument|corta|poupa)/i.test(contexto)) continue
      }
      // Olha os 60 caracteres logo antes do match atrás de uma negação.
      const antes = texto.slice(Math.max(0, m.index - 60), m.index)
      const antesLongo = texto.slice(Math.max(0, m.index - 160), m.index)
      // INTENCAO é a única regra em que a negação É o claim ("não quero te vender
      // nada"). Passar pelos guardas de negação abaixo mataria a regra inteira:
      // toda ocorrência dela casa por definição com o padrão de negação.
      if (regra.id !== 'INTENCAO') {
      if (NEGACAO.test(antesLongo)) continue
      if (regra.id === 'AUTOMACAO' && NEGACAO_AUTOMACAO.test(antesLongo)) continue
      if (/^due diligence$/i.test(m[0]) && DOCUMENTO_DE.test(antes)) continue
      if (TRAJETORIA_DO_LEAD.test(antesLongo)) continue
      }

      // Sem \b depois de "voc[êe]": em JS o acento nao e caractere de palavra,
      // entao a fronteira nunca casa depois do ê e o ramo ficaria morto.
      // "você desenvolveu o fluxo de invoices" é a trajetória do lead, mesmo que
      // a DAISEE apareça na sequência da frase. Só é claim quando o sujeito somos nós.
      if (regra.id === 'AUTORIA' && /\bvoc[êe][^.!?]{0,25}$/i.test(texto.slice(Math.max(0, m.index - 40), m.index))) continue

      if (regra.id === 'AUTOMACAO') {
        const frase = fraseAoRedor(texto, m.index)
        if (!SUJEITO_NOSSO.test(frase) && CONTEXTO_DO_LEAD.test(frase)) continue
      }

      const ini = Math.max(0, m.index - 60)
      achados.push({
        regra: regra.id,
        rotulo: regra.rotulo,
        trecho: '…' + texto.slice(ini, m.index + m[0].length + 60).replace(/\s+/g, ' ') + '…',
      })
      break // um achado por regra por touch já basta para sinalizar
    }
  }

  return achados
}

export function textoDoTouch(t: { subject?: string | null; content: string; message?: string | null }) {
  return [t.subject, t.content, t.message].filter(Boolean).join('\n')
}
