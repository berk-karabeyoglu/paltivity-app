import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'

export type Event = {
  id: string
  title: string
  description: string | null
  address: string | null
  starts_at: string
  ends_at: string | null
  max_attendees: number | null
  is_private: boolean
  status: string
  creator_id: string
  category_id: number | null
  latitude: number
  longitude: number
  emoji: string | null
}

// K4: Harita pan'inde debounce — her region change'de API çağrısı yapılmaz
const DEBOUNCE_MS = 600

export function useEvents(lat: number, lng: number, radiusKm = 10) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trigger, setTrigger] = useState(0)
  const abortRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latRef = useRef(lat)
  const lngRef = useRef(lng)

  useEffect(() => { latRef.current = lat }, [lat])
  useEffect(() => { lngRef.current = lng }, [lng])

  useEffect(() => {
    if (!lat || !lng) return

    if (abortRef.current) clearTimeout(abortRef.current)

    abortRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase.rpc('get_nearby_events', {
          lat: latRef.current,
          lng: lngRef.current,
          radius_km: radiusKm,
          from_time: new Date().toISOString(),
        })
        if (error) throw error
        setEvents(data ?? [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (abortRef.current) clearTimeout(abortRef.current)
    }
  }, [lat, lng, trigger])

  return { events, loading, error, refetch: () => setTrigger(t => t + 1) }
}
