import { useState, useEffect } from 'react'
import { apiRequest, isInstitutionSession } from '../lib/api'

export default function useAgeDistribution() {
  const [totalUsers, setTotalUsers] = useState(0)
  const [distribution, setDistribution] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    const institution = isInstitutionSession()

    apiRequest(institution ? '/api/institution/age-distribution/' : '/api/age-distribution/')
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'Failed to fetch')
        return res.json()
      })
      .then((json) => {
        if (!institution) return json
        const rows = Array.isArray(json) ? json : []
        return {
          total_users: rows.reduce((sum, r) => sum + (r.total || 0), 0),
          distribution: rows.map((r) => ({ age_group: r.age, count: r.total || 0 })),
        }
      })
      .then((json) => {
        if (!mounted) return
        setTotalUsers(json.total_users || 0)
        setDistribution(Array.isArray(json.distribution) ? json.distribution : [])
      })
      .catch((err) => { if (mounted) setError(err) })
      .finally(() => { if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [])

  return { totalUsers, distribution, loading, error }
}
