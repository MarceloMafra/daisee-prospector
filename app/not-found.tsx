import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          404
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Page not found
        </p>
        <Link
          href="/"
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
