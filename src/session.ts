const SESSION_KEY = 'store_user_id'

export function getSessionUserId(): number {
  const storedId = sessionStorage.getItem(SESSION_KEY)
  const parsedId = storedId ? Number(storedId) : NaN

  if (Number.isInteger(parsedId) && parsedId > 0) {
    return parsedId
  }

  const newId = Math.floor(100000 + Math.random() * 900000)
  sessionStorage.setItem(SESSION_KEY, String(newId))
  return newId
}
