import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const TYPING_EVENT = 'chat:typing'
const TYPING_START_EVENT = 'chat:typing:start'
const TYPING_STOP_EVENT = 'chat:typing:stop'
const IDLE_STOP_MS = 1200
const STALE_HIDE_MS = 2500
const START_THROTTLE_MS = 450

const normalizeId = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    const nestedId = value.id || value._id || value.userId || value.senderId || value.receiverId
    return nestedId ? String(nestedId) : ''
  }
  return String(value)
}

const getActiveChatMeta = (activeChat) => {
  const receiverId = normalizeId(activeChat?.receiverId || activeChat?.userId || activeChat?.id || activeChat?.user?.id)
  const conversationId = activeChat?.conversationId ?? null
  return {
    receiverId,
    conversationId: conversationId ? normalizeId(conversationId) : null,
  }
}

function useTypingIndicator(socket, activeChat, currentUserId) {
  const [typingByUser, setTypingByUser] = useState({})
  const typingTimeoutByUser = useRef({})
  const localIdleTimeoutRef = useRef(null)
  const localIsTypingRef = useRef(false)
  const lastStartEmitAtRef = useRef(0)
  const activeChatRef = useRef(activeChat)
  const currentUserIdRef = useRef(currentUserId ? String(currentUserId) : '')

  useEffect(() => {
    activeChatRef.current = activeChat
  }, [activeChat])

  useEffect(() => {
    currentUserIdRef.current = currentUserId ? String(currentUserId) : ''
  }, [currentUserId])

  const clearLocalIdleTimer = useCallback(() => {
    if (!localIdleTimeoutRef.current) return
    clearTimeout(localIdleTimeoutRef.current)
    localIdleTimeoutRef.current = null
  }, [])

  const emitTyping = useCallback(
    (eventName, chatSnapshot = activeChatRef.current) => {
      if (!socket) return
      const { receiverId, conversationId } = getActiveChatMeta(chatSnapshot)
      if (!receiverId) return
      socket.emit(eventName, { receiverId, conversationId })
    },
    [socket],
  )

  const stopTyping = useCallback(
    (chatSnapshot = activeChatRef.current) => {
      if (!localIsTypingRef.current) return
      emitTyping(TYPING_STOP_EVENT, chatSnapshot)
      localIsTypingRef.current = false
      clearLocalIdleTimer()
    },
    [clearLocalIdleTimer, emitTyping],
  )

  const handleInputChange = useCallback(
    (value) => {
      const inputValue = typeof value === 'string' ? value : ''
      const { receiverId } = getActiveChatMeta(activeChatRef.current)
      if (!receiverId) return

      if (!inputValue.trim()) {
        stopTyping()
        return
      }

      const now = Date.now()
      if (!localIsTypingRef.current || now - lastStartEmitAtRef.current >= START_THROTTLE_MS) {
        emitTyping(TYPING_START_EVENT)
        localIsTypingRef.current = true
        lastStartEmitAtRef.current = now
      }

      clearLocalIdleTimer()
      localIdleTimeoutRef.current = setTimeout(() => {
        stopTyping()
      }, IDLE_STOP_MS)
    },
    [clearLocalIdleTimer, emitTyping, stopTyping],
  )

  const handleInputBlur = useCallback(() => {
    stopTyping()
  }, [stopTyping])

  const handleMessageSent = useCallback(() => {
    stopTyping()
  }, [stopTyping])

  useEffect(() => {
    if (!socket) return undefined

    const handleTypingEvent = (payload = {}) => {
      const senderId = normalizeId(payload?.senderId || payload?.sender)
      const receiverId = normalizeId(payload?.receiverId || payload?.receiver)
      const payloadConversationId = payload?.conversationId ? normalizeId(payload.conversationId) : null
      const isTyping = Boolean(payload?.isTyping)
      const { receiverId: activeReceiverId, conversationId: activeConversationId } = getActiveChatMeta(activeChatRef.current)
      const localCurrentUserId = currentUserIdRef.current

      if (!senderId || !activeReceiverId) return
      if (senderId !== activeReceiverId) return
      if (localCurrentUserId && senderId === localCurrentUserId) return
      if (localCurrentUserId && receiverId && receiverId !== localCurrentUserId) return
      if (activeConversationId && payloadConversationId && payloadConversationId !== activeConversationId) return

      const existingTimer = typingTimeoutByUser.current[senderId]
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      setTypingByUser((prev) => ({ ...prev, [senderId]: isTyping }))

      if (isTyping) {
        typingTimeoutByUser.current[senderId] = setTimeout(() => {
          setTypingByUser((prev) => ({ ...prev, [senderId]: false }))
        }, STALE_HIDE_MS)
      } else {
        delete typingTimeoutByUser.current[senderId]
      }
    }

    socket.on(TYPING_EVENT, handleTypingEvent)
    return () => {
      socket.off(TYPING_EVENT, handleTypingEvent)
    }
  }, [socket])

  const previousChatMetaRef = useRef(getActiveChatMeta(activeChat))
  useEffect(() => {
    const previousMeta = previousChatMetaRef.current
    const nextMeta = getActiveChatMeta(activeChat)
    const chatChanged =
      previousMeta.receiverId !== nextMeta.receiverId || previousMeta.conversationId !== nextMeta.conversationId
    if (chatChanged) {
      if (localIsTypingRef.current) {
        stopTyping(previousMeta)
      }
      if (previousMeta.receiverId) {
        const previousTimer = typingTimeoutByUser.current[previousMeta.receiverId]
        if (previousTimer) {
          clearTimeout(previousTimer)
          delete typingTimeoutByUser.current[previousMeta.receiverId]
        }
        setTypingByUser((prev) => ({ ...prev, [previousMeta.receiverId]: false }))
      }
    }
    previousChatMetaRef.current = nextMeta
  }, [activeChat, stopTyping])

  useEffect(() => {
    return () => {
      stopTyping()
      clearLocalIdleTimer()
      Object.values(typingTimeoutByUser.current).forEach((timerId) => clearTimeout(timerId))
      typingTimeoutByUser.current = {}
    }
  }, [clearLocalIdleTimer, stopTyping])

  const isPeerTyping = useMemo(() => {
    const { receiverId } = getActiveChatMeta(activeChat)
    if (!receiverId) return false
    return Boolean(typingByUser[receiverId])
  }, [activeChat, typingByUser])

  return {
    isPeerTyping,
    handleInputChange,
    handleInputBlur,
    handleMessageSent,
  }
}

export default useTypingIndicator
