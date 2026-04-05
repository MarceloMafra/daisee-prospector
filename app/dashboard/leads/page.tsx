'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, FileText, Search } from 'lucide-react'

interface Lead {
  id: string
  name: string
  email: string
  company: string
  daiseeScore: number
  status: string
  createdAt: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/leads')
        if (response.ok) {
          const data = await response.json()
          setLeads(data.leads || [])
        }
      } catch (error) {
        console.error('Failed to fetch leads:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [])

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Leads
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage and track your sales leads
          </p>
        </div>
        <Link href="/dashboard/leads/import">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Import Leads
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800"
            />
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lead List</CardTitle>
          <CardDescription>
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <p className="text-gray-500">Loading leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {leads.length === 0
                  ? 'No leads yet. Import your first batch to get started.'
                  : 'No leads match your search.'}
              </p>
              {leads.length === 0 && (
                <Link href="/dashboard/leads/import">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Import Leads
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-sm">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-sm">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-sm">
                      Company
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-sm">
                      Score
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-sm">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-sm">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {lead.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {lead.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {lead.company}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          {lead.daiseeScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
