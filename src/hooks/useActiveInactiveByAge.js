import { useState, useEffect } from 'react'
import { apiRequest, isInstitutionSession } from '../lib/api'

export default function useActiveInactiveByAge() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    const institution = isInstitutionSession()

    apiRequest(institution ? '/api/institution/age-distribution/' : '/api/active-inactive-by-age/')
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'Failed to fetch')
        return res.json()
      })
      .then((json) => (institution
        ? { groups: (Array.isArray(json) ? json : []).map((r) => ({ age_group: r.age, active: r.active || 0, inactive: r.inactive || 0 })) }
        : json))
      .then((json) => { if (mounted) setGroups(Array.isArray(json.groups) ? json.groups : []) })
      .catch((err) => { if (mounted) setError(err) })
      .finally(() => { if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [])

  return { groups, loading, error }
}
