'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, BarChart3, MessageSquare, Shield } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated, redirect to dashboard
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          router.push('/dashboard')
        }
      } catch (error) {
        // Not authenticated, show landing page
      }
    }

    checkAuth()
  }, [router])

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary-600" />
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            DAISEE Prospector
          </span>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Get Started
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              AI-Powered Lead Intelligence & Cadencia Generation
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Import leads, calculate DAISEE scores, analyze LinkedIn profiles, and generate personalized 5-touch cadencias with AI. Built for Brazilian sales teams.
            </p>
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Launch App
              </Link>
              <Link
                href="/docs"
                className="px-8 py-3 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid gap-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-3 mb-2">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  CSV Import
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Upload your lead lists and instantly calculate DAISEE scores
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-3 mb-2">
                <BarChart3 className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  DAISEE Scoring
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Proprietary algorithm for ranking lead quality by seniority and fit
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-3 mb-2">
                <MessageSquare className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  AI Cadencias
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Generate personalized 5-touch sequences with Claude API
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-3 mb-2">
                <Shield className="w-6 h-6 text-red-600 flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Compliance
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Validate messages against LGPD, ANVISA, SUSEP, CONAR regulations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 px-6 mt-20">
        <div className="max-w-7xl mx-auto text-center text-gray-600 dark:text-gray-400">
          <p>Built with Next.js, Prisma, and Claude API</p>
        </div>
      </footer>
    </main>
  )
}
