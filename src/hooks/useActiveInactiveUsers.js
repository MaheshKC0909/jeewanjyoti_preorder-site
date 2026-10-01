import { useState, useEffect } from 'react'
import { apiRequest, isInstitutionSession } from '../lib/api'

export default function useActiveInactiveUsers() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    const institution = isInstitutionSession()

    apiRequest(institution ? '/api/institution/dashboard-stats/' : '/api/active-inactive-users/')
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'Failed to fetch')
        return res.json()
      })
      .then((json) => (institution
        ? { ...json, active_count: json.active_members, inactive_count: json.inactive_members }
        : json))
      .then((json) => { if (mounted) setData(json) })
      .catch((err) => { if (mounted) setError(err) })
      .finally(() => { if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [])

  return { data, loading, error }
}
