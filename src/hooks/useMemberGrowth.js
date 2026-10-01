import { useState, useEffect } from 'react'
import { apiRequest, isInstitutionSession } from '../lib/api'

export default function useMemberGrowth() {
  const [weekly, setWeekly] = useState([])
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    const fetchJson = (endpoint) => apiRequest(endpoint).then((res) => {
      if (!res.ok) throw new Error(res.statusText || 'Failed to fetch')
      return res.json()
    })
    const toGrowth = (rows) => (Array.isArray(rows) ? rows : []).map((r) => ({ ...r, new_members: r.added ?? 0 }))

    const request = isInstitutionSession()
      ? Promise.all([
          fetchJson('/api/institution/weekly-members/'),
          fetchJson('/api/institution/monthly-members/'),
        ]).then(([weeklyRows, monthlyRows]) => ({ weekly: toGrowth(weeklyRows), monthly: toGrowth(monthlyRows) }))
      : fetchJson('/api/member-growth/')

    request
      .then((json) => {
        if (!mounted) return
        setWeekly(Array.isArray(json.weekly) ? json.weekly : [])
        setMonthly(Array.isArray(json.monthly) ? json.monthly : [])
      })
      .catch((err) => { if (mounted) setError(err) })
      .finally(() => { if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [])

  return { weekly, monthly, loading, error }
}
