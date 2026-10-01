import { useState, useEffect } from 'react'
import { apiRequest, isInstitutionSession } from '../lib/api'

export default function useWeekComparison() {
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    const institution = isInstitutionSession()

    apiRequest(institution ? '/api/institution/week-comparison/' : '/api/week-comparison/')
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'Failed to fetch')
        return res.json()
      })
      .then((json) => (institution
        ? { days: (Array.isArray(json) ? json : []).map((d) => ({ day: d.day, this_week: d.thisWeek ?? 0, last_week: d.lastWeek ?? 0 })) }
        : json))
      .then((json) => {
        if (!mounted) return
        setDays(Array.isArray(json.days) ? json.days : [])
      })
      .catch((err) => { if (mounted) setError(err) })
      .finally(() => { if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [])

  return { days, loading, error }
}
