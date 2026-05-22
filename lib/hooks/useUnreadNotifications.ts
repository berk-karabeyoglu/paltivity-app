import { createContext, useContext } from 'react'

type UnreadContextType = {
  unreadCount: number
  refresh: () => void
}

export const UnreadContext = createContext<UnreadContextType>({ unreadCount: 0, refresh: () => {} })
export const useUnread = () => useContext(UnreadContext)
