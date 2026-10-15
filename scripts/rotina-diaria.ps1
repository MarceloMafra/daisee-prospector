# Rotina diaria da campanha: prepara a fila de manha e dispara a quota do dia.
#
# Por que duas etapas separadas, e nao o cron da Vercel:
#   - O preparo enriquece perfil pela Unipile e gera cadencia pela IA. Leva de
#     1h a 5h para ~40 leads. A rota /api/cron/process-touches tem maxDuration
#     de 60 segundos, entao nao cabe la -- por isso bulk-prepare.ts existe como
#     script local, "sem timeout de serverless".
#   - O envio precisa de 30 a 90 segundos ENTRE convites. O processScheduledTouches
#     manda em laco, sem pausa nenhuma: 40 convites sairiam em segundos, que e a
#     assinatura de automacao que faz o LinkedIn restringir a conta.
#
# Agenda: preparo as 19h (para o lote do dia seguinte) e envio as 08h.
# A maquina nao fica ligada de madrugada, entao o trabalho pesado -- enriquecer
# perfil e gerar cadencia -- acontece no fim do expediente, com a fila ja pronta
# quando o disparo comeca de manha.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\rotina-diaria.ps1 -Etapa preparo
#   powershell -ExecutionPolicy Bypass -File scripts\rotina-diaria.ps1 -Etapa envio
#   ... -Etapa envio -DryRun      (ensaia, nao envia)
#
# A quota diaria e do LinkedIn, nao um orcamento acumulavel: dia parado nao vira
# credito no dia seguinte. Por isso o envio pede sempre 40, nunca o atrasado.

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('preparo', 'envio')]
    [string]$Etapa,

    [int]$Quantidade = 40,
    [int]$LimitePreparo = 42,
    [switch]$DryRun,
    [switch]$IgnorarDiaNaoUtil
)

$ErrorActionPreference = 'Stop'
$projeto = Split-Path -Parent $PSScriptRoot
Set-Location $projeto

$pastaLogs = Join-Path $projeto '.aiox\logs'
if (-not (Test-Path $pastaLogs)) { New-Item -ItemType Directory -Force -Path $pastaLogs | Out-Null }
$log = Join-Path $pastaLogs ("rotina-{0}.log" -f (Get-Date -Format 'yyyy-MM-dd'))

# Write-Host e nao Write-Output de proposito: Write-Output cai no fluxo de saida
# e seria capturado por "$codigo = RodarNode ...", misturando o log inteiro com o
# codigo de retorno. O registro duravel e o arquivo de log, nao o stdout.
function Escrever($texto) {
    $linha = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $texto
    Write-Host $linha
    Add-Content -Path $log -Value $linha -Encoding utf8
}

# No PowerShell 5.1, redirecionar stderr de um executavel nativo embrulha cada
# linha num ErrorRecord (NativeCommandError). Com ErrorActionPreference = Stop
# isso aborta o script -- e o npm escreve avisos em stderr sempre. Entao os
# comandos nativos rodam com Continue e o codigo de saida e checado na mao.
function RodarNode([string[]]$argumentos) {
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & .\node_modules\.bin\dotenv @argumentos 2>&1 | ForEach-Object { Escrever ($_ | Out-String).TrimEnd() }
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $anterior
    }
}

# Feriados nacionais fixos + os moveis de 2026 e 2027. Sem isso a rotina gasta a
# quota num dia em que o lead nao abre o LinkedIn -- e convite nao aceito em 7
# dias e convite que entope a fila de pendentes do LinkedIn.
$feriados = @(
    '2026-01-01','2026-02-16','2026-02-17','2026-04-03','2026-04-21','2026-05-01',
    '2026-06-04','2026-09-07','2026-10-12','2026-11-02','2026-11-15','2026-11-20','2026-12-25',
    '2027-01-01','2027-02-08','2027-02-09','2027-03-26','2027-04-21','2027-05-01',
    '2027-05-27','2027-09-07','2027-10-12','2027-11-02','2027-11-15','2027-11-20','2027-12-25'
)

# As duas etapas rodam em DIA UTIL, e so isso. O preparo das 19h de um dia util
# abastece o proximo dia util -- entao a sexta prepara a segunda sozinha, sem
# regra especial.
#
# A primeira versao disto olhava o calendario de AMANHA no preparo, achando que
# era mais preciso. Era pior: na sexta "amanha" e sabado, entao o preparo pulava
# e a SEGUNDA amanhecia com a fila vazia. Depender do preparo de domingo exige a
# maquina ligada no domingo a noite, que e exatamente o que nao se pode assumir.
$hoje = Get-Date
$hojeIso = $hoje.ToString('yyyy-MM-dd')
$fimDeSemana = $hoje.DayOfWeek -eq 'Saturday' -or $hoje.DayOfWeek -eq 'Sunday'
$ehFeriado = $feriados -contains $hojeIso

if (($fimDeSemana -or $ehFeriado) -and -not $IgnorarDiaNaoUtil) {
    $motivo = if ($ehFeriado) { 'feriado' } else { 'fim de semana' }
    Escrever "Etapa '$Etapa' pulada: hoje ($hojeIso) e $motivo. Use -IgnorarDiaNaoUtil para forcar."
    exit 0
}

$tsx = '.\node_modules\.bin\dotenv'
if (-not (Test-Path $tsx)) {
    Escrever "ERRO: dependencias nao instaladas (node_modules ausente). Rode pnpm install."
    exit 1
}

if ($Etapa -eq 'preparo') {
    Escrever "PREPARO: iniciando com limite $LimitePreparo (faixas ALVO,TALVEZ)."
    $codigo = RodarNode @('-e', '.env.local', '--', 'npx', 'tsx', 'scripts/bulk-prepare.ts',
                          '--limite', "$LimitePreparo", '--faixas', 'ALVO,TALVEZ')
    Escrever "PREPARO: concluido com codigo $codigo."
    exit $codigo
}

# Envio. O send-batch audita cada texto e PULA o reprovado -- nenhuma copy com
# numero inventado ou claim falso sai sem humano.
$modo = if ($DryRun) { '--dry-run' } else { '--apply' }
Escrever "ENVIO: iniciando $Quantidade convites ($modo)."
$codigo = RodarNode @('-e', '.env.local', '--', 'npx', 'tsx', 'scripts/send-batch.ts', "$Quantidade", $modo)
Escrever "ENVIO: concluido com codigo $codigo."

if ($DryRun) { exit $codigo }

# Conferencia depois do envio, cruzando o banco com o inbox real do LinkedIn.
#
# Por que logo apos o lote: se o Neon cair DEPOIS de o convite sair e antes de
# gravar, o convite chegou ao lead e o touch continua AGENDADO -- no dia seguinte
# a rotina manda o mesmo convite de novo. Foi o incidente de 10/09, com 11 leads.
# A retentativa em lib/dbRetry.ts reduz a chance; esta conferencia pega o que
# escapar. Sem ninguem olhando de manha, as duas precisam existir.
#
# Sem --apply: so relata. Reconciliar o banco mexe em historico de cadencia e
# fica para decisao humana, com o relatorio na mao.
Escrever "CONFERENCIA: cruzando o banco com o inbox do LinkedIn."
$codigoConf = RodarNode @('-e', '.env.local', '--', 'npx', 'tsx', 'scripts/conferir-envios-linkedin.ts')
if ($codigoConf -ne 0) {
    Escrever "CONFERENCIA: FALHOU (codigo $codigoConf). Rode scripts/conferir-envios-linkedin.ts a mao antes do proximo lote."
} else {
    Escrever "CONFERENCIA: concluida. Divergencia encontrada aparece no log acima."
}

exit $codigo
