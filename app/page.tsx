import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, BarChart3, MessageSquare, Shield } from 'lucide-react'
import { authOptions } from '@/lib/auth'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Navegação */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary-600" />
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            DAISEE Prospector
          </span>
        </div>
        <Link
          href="/login"
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Acessar
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Inteligência de Leads e Geração de Cadências com IA
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Importe leads, calcule scores DAISEE, analise perfis do LinkedIn e gere cadências personalizadas com 5 touches usando IA. Feito para equipes de vendas brasileiras.
            </p>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Acessar o App
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="grid gap-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-3 mb-2">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Importação CSV</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Faça upload das suas listas de leads e calcule os scores DAISEE instantaneamente
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-3 mb-2">
                <BarChart3 className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Score DAISEE</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Algoritmo proprietário que classifica leads por senioridade e fit com sua empresa
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-3 mb-2">
                <MessageSquare className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Cadências com IA</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Gere sequências personalizadas de 5 touches em português com a API Claude
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-3 mb-2">
                <Shield className="w-6 h-6 text-red-600 flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Compliance</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Valide suas mensagens contra as regulações LGPD, ANVISA, SUSEP e CONAR
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 px-6 mt-20">
        <div className="max-w-7xl mx-auto text-center text-gray-600 dark:text-gray-400">
          <p>Desenvolvido com Next.js, Prisma e API Claude</p>
        </div>
      </footer>
    </main>
  )
}
