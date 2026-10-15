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
          className="px-6 py-2 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
