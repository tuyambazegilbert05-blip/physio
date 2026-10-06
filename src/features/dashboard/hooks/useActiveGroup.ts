'use client'

import { useCallback, useEffect, useState } from 'react'
import { groupService } from '@/features/groups/services/group.service'
import type { Group } from '@/types/group'

export const ACTIVE_GROUP_STORAGE_KEY = 'Phyaio Cycle-active-group'
export const ACTIVE_GROUP_CHANGE_EVENT = 'phyaio-active-group-change'

export function persistActiveGroup(groupId: string) {
  window.localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, groupId)
  window.dispatchEvent(new Event(ACTIVE_GROUP_CHANGE_EVENT))
}

export function useActiveGroup(preferredGroupId?: string, allowedGroupIds?: string[]) {
  const allowedGroupKey = allowedGroupIds?.join(',')
  const [groups, setGroups] = useState<Group[]>([])
  const [group, setGroupState] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let mounted = true
    let availableGroups: Group[] = []

    const syncSelectedGroup = () => {
      if (!mounted) return
      const stored = window.localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY)
      setGroupState(
        availableGroups.find((item) => item.id === preferredGroupId) ??
          availableGroups.find((item) => item.id === stored) ??
          availableGroups[0] ??
          null,
      )
    }

    groupService
      .list()
      .then((items) => {
        if (!mounted) return
        availableGroups = allowedGroupKey
          ? items.filter((item) => allowedGroupKey.split(',').includes(item.id))
          : items
        setGroups(availableGroups)
        syncSelectedGroup()
      })
      .catch((reason: unknown) => {
        if (mounted) setError(reason instanceof Error ? reason.message : 'Unable to load groups.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    window.addEventListener(ACTIVE_GROUP_CHANGE_EVENT, syncSelectedGroup)
    window.addEventListener('storage', syncSelectedGroup)
    return () => {
      mounted = false
      window.removeEventListener(ACTIVE_GROUP_CHANGE_EVENT, syncSelectedGroup)
      window.removeEventListener('storage', syncSelectedGroup)
    }
  }, [allowedGroupKey, preferredGroupId])
  const setGroup = useCallback((next: Group) => {
    setGroupState(next)
    persistActiveGroup(next.id)
  }, [])
  return { groups, group, setGroup, loading, error }
}
