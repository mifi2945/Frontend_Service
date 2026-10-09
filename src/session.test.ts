import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSessionUserId } from './session'

function createStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  }
}

describe('session identity', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates and stores a positive numeric user ID', () => {
    const userId = getSessionUserId()

    expect(Number.isInteger(userId)).toBe(true)
    expect(userId).toBeGreaterThanOrEqual(100000)
    expect(userId).toBeLessThanOrEqual(999999)
    expect(sessionStorage.getItem('store_user_id')).toBe(String(userId))
  })

  it('returns the same user ID for the browser session', () => {
    sessionStorage.setItem('store_user_id', '835974')

    expect(getSessionUserId()).toBe(835974)
    expect(getSessionUserId()).toBe(835974)
  })

  it('replaces an invalid stored ID', () => {
    sessionStorage.setItem('store_user_id', 'not-a-number')

    const userId = getSessionUserId()
    expect(userId).toBeGreaterThanOrEqual(100000)
    expect(sessionStorage.getItem('store_user_id')).toBe(String(userId))
  })
})
