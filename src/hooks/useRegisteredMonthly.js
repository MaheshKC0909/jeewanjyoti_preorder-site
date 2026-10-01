import { useState, useEffect } from 'react'
import { apiRequest, isInstitutionSession } from '../lib/api'

export default function useRegisteredMonthly() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    apiRequest(isInstitutionSession() ? '/api/institution/member-growth/' : '/api/registered-monthly/')
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'Failed to fetch')
        return res.json()
      })
      .then((json) => { if (mounted) setData(json) })
      .catch((err) => { if (mounted) setError(err) })
      .finally(() => { if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [])

  return { data, loading, error }
}
