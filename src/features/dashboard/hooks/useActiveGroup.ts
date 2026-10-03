'use client'

import { useEffect, useState } from 'react'
import { groupService } from '@/features/groups/services/group.service'
import type { Group } from '@/types/group'

export function useActiveGroup() {
  const [groups, setGroups] = useState<Group[]>([])
  const [group, setGroupState] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    groupService.list().then((items) => {
      setGroups(items)
      const stored = window.localStorage.getItem('Phyaio Cycle-active-group')
      setGroupState(items.find((item) => item.id === stored) ?? items[0] ?? null)
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load groups.')).finally(() => setLoading(false))
  }, [])
  function setGroup(next: Group) {
    setGroupState(next); window.localStorage.setItem('Phyaio Cycle-active-group', next.id)
  }
  return { groups, group, setGroup, loading, error }
}
