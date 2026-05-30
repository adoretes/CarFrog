import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createEmptyCharaCard, type CharaCard } from '../types'
import type { CharaAction } from '../types/actions'
import { ensureCharaCard } from '../utils/charaUtils'

function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    if (typeof current === 'object') {
      const arrMatch = key.match(/^(\w+)\[(\d+)\]$/)
      if (arrMatch) {
        current = (current as Record<string, unknown>)[arrMatch[1]]
        if (Array.isArray(current)) {
          current = current[parseInt(arrMatch[2])]
        } else {
          return undefined
        }
      } else {
        current = (current as Record<string, unknown>)[key]
      }
    } else {
      return undefined
    }
  }
  return current
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const arrMatch = key.match(/^(\w+)\[(\d+)\]$/)
    if (arrMatch) {
      const arr = current[arrMatch[1]]
      if (Array.isArray(arr)) {
        current = arr[parseInt(arrMatch[2])] as Record<string, unknown>
      } else {
        return
      }
    } else {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key] as Record<string, unknown>
    }
  }
  const lastKey = keys[keys.length - 1]
  const lastArrMatch = lastKey.match(/^(\w+)\[(\d+)\]$/)
  if (lastArrMatch) {
    const arr = current[lastArrMatch[1]]
    if (Array.isArray(arr)) {
      arr[parseInt(lastArrMatch[2])] = value
    }
  } else {
    current[lastKey] = value as never
  }
}

function executeSet(state: CharaCard, path: string, value: unknown, index?: number): CharaCard {
  const newCard = structuredClone(state)
  if (index !== undefined) {
    const arr = getNestedValue(newCard, path)
    if (Array.isArray(arr) && index >= 0 && index < arr.length) {
      arr[index] = value
    }
  } else {
    setNestedValue(newCard as unknown as Record<string, unknown>, path, value)
  }
  return newCard
}

function executeAdd(state: CharaCard, path: string, value: unknown): CharaCard {
  const newCard = structuredClone(state)
  const arr = getNestedValue(newCard, path)
  if (Array.isArray(arr)) {
    arr.push(value)
  }
  return newCard
}

function executeRemove(state: CharaCard, path: string, index: number): CharaCard {
  const newCard = structuredClone(state)
  const arr = getNestedValue(newCard, path)
  if (Array.isArray(arr) && index >= 0 && index < arr.length) {
    arr.splice(index, 1)
  }
  return newCard
}

interface CharaState {
  card: CharaCard
  setCard: (card: CharaCard) => void
  setField: (path: string, value: unknown) => void
  executeActions: (actions: CharaAction[]) => void
  loadFromJson: (json: string) => boolean
  resetCard: () => void
}

export const useCharaStore = create<CharaState>()(
  persist(
    (set) => ({
      card: createEmptyCharaCard(),

      setCard: (card) => set({ card: ensureCharaCard(card) }),

      setField: (path, value) =>
        set((state) => {
          const newCard = structuredClone(state.card)
          setNestedValue(newCard as unknown as Record<string, unknown>, path, value)
          return { card: newCard }
        }),

      executeActions: (actions) =>
        set((state) => {
          let card = structuredClone(state.card)
          for (const action of actions) {
            switch (action.type) {
              case 'set':
                card = executeSet(card, action.path, action.value, action.index)
                break
              case 'add':
                card = executeAdd(card, action.path, action.value)
                break
              case 'remove':
                card = executeRemove(card, action.path, action.index)
                break
            }
          }
          return { card }
        }),

      loadFromJson: (json) => {
        try {
          const parsed = JSON.parse(json)
          if (parsed.spec && parsed.data) {
            set({ card: ensureCharaCard(parsed) })
            return true
          }
          return false
        } catch {
          return false
        }
      },

      resetCard: () => set({ card: createEmptyCharaCard() }),
    }),
    {
      name: 'carfrog-chara',
      partialize: (state) => ({ card: state.card }),
    },
  ),
)
