import type { Relatorio } from '@/components/relatorio/tipos'

interface RitmoChartProps {
  ritmo: Relatorio['ritmo']
  /** Altura da área das barras, em px. */
  altura?: number
}

/**
 * Convites e aceites por dia. O valor de cada barra aparece em cima dela e os
 * totais do período vão na legenda — o gráfico se lê sem passar o mouse.
 */
export function RitmoChart({ ritmo, altura = 128 }: RitmoChartProps) {
  const pico = Math.max(...ritmo.map((r) => Math.max(r.enviados, r.aceites)), 1)
  const hojeBR = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
  const totalConvites = ritmo.reduce((s, r) => s + r.enviados, 0)
  const totalAceites = ritmo.reduce((s, r) => s + r.aceites, 0)

  return (
    <div>
      <div className="overflow-x-auto">
        {/* pt-5 abre espaço para o número da barra mais alta */}
        <div className="flex gap-1.5 items-end min-w-[640px] pt-5" style={{ height: altura + 20 }}>
          {ritmo.map((r) => (
            <div key={r.dia} className="flex-1 flex flex-col justify-end h-full">
              <div
                className="flex gap-0.5 items-end"
                style={{ height: altura }}
                title={`${r.dia}: ${r.enviados} convites, ${r.aceites} aceites`}
              >
                {[
                  { v: r.enviados, cor: 'bg-blue-500', rotulo: 'text-blue-600 dark:text-blue-400' },
                  { v: r.aceites, cor: 'bg-primary-500', rotulo: 'text-primary-600 dark:text-primary-400' },
                ].map((b, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end items-center h-full">
                    <span
                      className={`text-[10px] leading-none font-mono tabular-nums pb-0.5 ${
                        b.v ? b.rotulo : 'text-transparent'
                      }`}
                    >
                      {b.v || 0}
                    </span>
                    <div
                      className={`w-full rounded-t-sm ${b.v ? b.cor : 'bg-gray-200 dark:bg-gray-700'}`}
                      style={{ height: `${Math.max((b.v / pico) * 100, 2)}%`, maxHeight: 'calc(100% - 14px)' }}
                    />
                  </div>
                ))}
              </div>
              <span
                className={`text-[10px] font-mono text-center pt-1.5 border-t border-gray-100 dark:border-gray-700 ${
                  r.dia === hojeBR ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500'
                }`}
              >
                {r.dia.slice(8)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-gray-600 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
          convites <b className="font-mono text-gray-900 dark:text-white">{totalConvites}</b>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-sm bg-primary-500" />
          aceites <b className="font-mono text-gray-900 dark:text-white">{totalAceites}</b>
        </span>
        <span className="text-gray-500">últimos {ritmo.length} dias</span>
      </div>
    </div>
  )
}
