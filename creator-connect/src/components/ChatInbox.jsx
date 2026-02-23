import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import {
  getInboxConversations,
  getMessagesByUserId,
  searchChatUsers,
  sendChatMessage,
} from '../api/chatApi'
import { ApiError } from '../api/client'

const SOCKET_EVENT = 'chat:message'

const toArray = (value) => {
  if (Array.isArray(value)) return value
  return []
}

const getInitials = (value = '') => {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'U'
  const initials = parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('')
  return initials || 'U'
}

const formatConversationTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const sameDay = now.toDateString() === date.toDateString()
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const normalizeUser = (rawUser = {}) => {
  const id = rawUser.id || rawUser._id || rawUser.userId || ''
  const name = rawUser.name || rawUser.fullName || rawUser.username || rawUser.email || 'Unknown User'
  const email = rawUser.email || ''
  return { id: String(id), name, email }
}

const normalizeConversation = (rawConversation = {}) => {
  const fallbackUser = {
    id: rawConversation.userId || rawConversation.participantId || '',
    name: rawConversation.userName || rawConversation.name || rawConversation.email || 'Unknown User',
    email: rawConversation.userEmail || rawConversation.email || '',
  }
  const user = normalizeUser(
    rawConversation.user ||
      rawConversation.participant ||
      rawConversation.otherUser ||
      rawConversation.peer ||
      fallbackUser,
  )
  const rawLastMessage = rawConversation.lastMessage || rawConversation.latestMessage || {}
  const lastMessageText =
    typeof rawLastMessage === 'string'
      ? rawLastMessage
      : rawLastMessage.message || rawLastMessage.text || rawConversation.lastMessageText || ''
  const updatedAt =
    rawLastMessage.createdAt ||
    rawLastMessage.timestamp ||
    rawConversation.updatedAt ||
    rawConversation.lastMessageAt ||
    ''
  const unreadCount = Number(rawConversation.unreadCount || rawConversation.unread || 0) || 0

  return {
    id: user.id,
    user,
    lastMessageText,
    updatedAt,
    unreadCount,
  }
}

const normalizeMessage = (rawMessage = {}) => {
  const sender = rawMessage.sender || rawMessage.from || {}
  const receiver = rawMessage.receiver || rawMessage.to || {}
  return {
    id: String(rawMessage.id || rawMessage._id || rawMessage.clientId || `msg-${Date.now()}`),
    message: rawMessage.body || rawMessage.message || rawMessage.text || '',
    createdAt: rawMessage.createdAt || rawMessage.timestamp || new Date().toISOString(),
    senderId: String(rawMessage.senderId || sender.id || sender._id || ''),
    receiverId: String(rawMessage.receiverId || receiver.id || receiver._id || ''),
    senderEmail: rawMessage.senderEmail || sender.email || '',
    pending: Boolean(rawMessage.pending),
    failed: Boolean(rawMessage.failed),
  }
}

const getDataList = (response) => toArray(response?.data || response?.conversations || response?.messages || response)
const getMessagesList = (response) => toArray(response?.data?.messages ?? response?.messages ?? [])

const getChatErrorMessage = (error, fallbackMessage) => {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Session expired or unauthorized. Please log in again.'
    }
    if (error.status === 404) {
      return 'Chat endpoint not found. Confirm backend chat routes are available.'
    }
  }
  return error?.message || fallbackMessage
}

const resolveSocketUrl = () => {
  const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL
  if (explicitSocketUrl) return explicitSocketUrl

  const explicitApiOrigin = import.meta.env.VITE_API_ORIGIN
  if (explicitApiOrigin) return explicitApiOrigin

  if (import.meta.env.DEV) return 'http://localhost:5000'

  return window.location.origin
}

function ChatInbox({ token, currentUserEmail, initialSelectedUser = null }) {
  const [conversations, setConversations] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [draftMessage, setDraftMessage] = useState('')
  const [isLoadingInbox, setIsLoadingInbox] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [inboxError, setInboxError] = useState('')
  const [messagesError, setMessagesError] = useState('')
  const [usersError, setUsersError] = useState('')
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [userResults, setUserResults] = useState([])
  const endOfMessagesRef = useRef(null)
  const selectedUserRef = useRef(null)

  const resolvedToken = token || localStorage.getItem('token') || localStorage.getItem('auth_token') || ''
  const socketAuthToken = resolvedToken.startsWith('Bearer ') ? resolvedToken : `Bearer ${resolvedToken}`

  const selectedConversationTitle = selectedUser?.name || 'Conversation'

  const loadInbox = useCallback(async () => {
    if (!resolvedToken) return
    setIsLoadingInbox(true)
    setInboxError('')
    try {
      const response = await getInboxConversations(resolvedToken)
      const nextConversations = getDataList(response).map(normalizeConversation).filter((entry) => entry.id)
      setConversations(nextConversations)
      setSelectedUser((prevSelectedUser) => prevSelectedUser || nextConversations[0]?.user || null)
    } catch (error) {
      setInboxError(getChatErrorMessage(error, 'Could not load inbox'))
    } finally {
      setIsLoadingInbox(false)
    }
  }, [resolvedToken])

  const loadMessages = useCallback(async (userId) => {
    if (!resolvedToken || !userId) return
    setIsLoadingMessages(true)
    setMessagesError('')
    try {
      const response = await getMessagesByUserId(resolvedToken, userId)
      const nextMessages = getMessagesList(response).map(normalizeMessage)
      setMessages(nextMessages)
    } catch (error) {
      setMessagesError(getChatErrorMessage(error, 'Could not load messages'))
      setMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }, [resolvedToken])

  const upsertConversationPreview = (user, previewText, previewTime, unreadCount = 0) => {
    setConversations((prevConversations) => {
      const existing = prevConversations.find((entry) => entry.id === user.id)
      const next = {
        id: user.id,
        user,
        lastMessageText: previewText,
        updatedAt: previewTime,
        unreadCount: existing ? existing.unreadCount + unreadCount : unreadCount,
      }
      const remaining = prevConversations.filter((entry) => entry.id !== user.id)
      return [next, ...remaining]
    })
  }

  const handleSelectUser = (user) => {
    if (!user?.id) return
    setSelectedUser(user)
    setMessages([])
    setMessagesError('')
    setIsPickerOpen(false)
    setConversations((prevConversations) =>
      prevConversations.map((entry) => (entry.id === user.id ? { ...entry, unreadCount: 0 } : entry)),
    )
  }

  const handleSendMessage = async (event) => {
    event.preventDefault()
    if (!resolvedToken || !selectedUser?.id || !draftMessage.trim() || isSendingMessage) return

    const content = draftMessage.trim()
    const optimisticId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: optimisticId,
      message: content,
      createdAt: new Date().toISOString(),
      senderEmail: currentUserEmail,
      senderId: 'self',
      receiverId: selectedUser.id,
      pending: true,
      failed: false,
    }

    setMessages((prevMessages) => [...prevMessages, optimisticMessage])
    setDraftMessage('')
    setIsSendingMessage(true)
    upsertConversationPreview(selectedUser, content, optimisticMessage.createdAt, 0)

    try {
      const response = await sendChatMessage(resolvedToken, {
        receiverId: selectedUser.id,
        body: content,
      })
      const persistedMessage = normalizeMessage(response?.data || response?.message || {})
      setMessages((prevMessages) =>
        prevMessages.map((entry) => (entry.id === optimisticId ? { ...persistedMessage, pending: false } : entry)),
      )
      upsertConversationPreview(selectedUser, persistedMessage.message || content, persistedMessage.createdAt, 0)
    } catch (error) {
      setMessages((prevMessages) =>
        prevMessages.map((entry) => (entry.id === optimisticId ? { ...entry, pending: false, failed: true } : entry)),
      )
      setMessagesError(getChatErrorMessage(error, 'Could not send message'))
    } finally {
      setIsSendingMessage(false)
    }
  }

  useEffect(() => {
    loadInbox()
  }, [loadInbox])

  useEffect(() => {
    if (!selectedUser?.id) return
    loadMessages(selectedUser.id)
  }, [loadMessages, selectedUser?.id])

  useEffect(() => {
    if (!isPickerOpen || !resolvedToken) return undefined

    const timeoutId = setTimeout(async () => {
      setIsSearchingUsers(true)
      setUsersError('')
      try {
        const response = await searchChatUsers(resolvedToken, userSearch.trim())
        const nextUsers = getDataList(response).map(normalizeUser).filter((user) => user.id)
        setUserResults(nextUsers)
      } catch (error) {
        setUsersError(getChatErrorMessage(error, 'Could not search users'))
      } finally {
        setIsSearchingUsers(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [isPickerOpen, resolvedToken, userSearch])

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    selectedUserRef.current = selectedUser
  }, [selectedUser])

  useEffect(() => {
    if (!resolvedToken) return undefined

    const socket = io(resolveSocketUrl(), {
      path: '/socket.io',
      withCredentials: true,
      auth: { token: socketAuthToken },
      transports: ['polling', 'websocket'],
    })

    socket.on('connect', () => {
      console.log('socket connected', socket.id)
    })

    socket.on('connect_error', (err) => {
      console.error('socket connect_error:', err.message)
    })

    socket.on(SOCKET_EVENT, (payload) => {
      const incomingMessage = normalizeMessage(payload?.data || payload?.message || payload || {})
      const senderId = incomingMessage.senderId
      const receiverId = incomingMessage.receiverId
      const currentSelectedUser = selectedUserRef.current
      const belongsToOpenThread =
        Boolean(currentSelectedUser?.id) && [senderId, receiverId].includes(String(currentSelectedUser.id))
      const isOwnMessage = incomingMessage.senderEmail && incomingMessage.senderEmail === currentUserEmail

      if (belongsToOpenThread) {
        setMessages((prevMessages) => {
          if (prevMessages.some((entry) => entry.id === incomingMessage.id)) {
            return prevMessages
          }
          return [...prevMessages, incomingMessage]
        })
      }

      if (currentSelectedUser?.id) {
        const unreadIncrement = belongsToOpenThread || isOwnMessage ? 0 : 1
        upsertConversationPreview(
          currentSelectedUser,
          incomingMessage.message || 'New message',
          incomingMessage.createdAt,
          unreadIncrement,
        )
      }

      loadInbox()
    })

    return () => {
      socket.off('connect')
      socket.off('connect_error')
      socket.off(SOCKET_EVENT)
      socket.disconnect()
    }
  }, [resolvedToken, socketAuthToken, currentUserEmail, loadInbox])

  const currentConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedUser?.id),
    [conversations, selectedUser],
  )

  useEffect(() => {
    if (!initialSelectedUser?.id) return
    setSelectedUser((prevSelectedUser) => {
      if (prevSelectedUser?.id === initialSelectedUser.id) return prevSelectedUser
      return initialSelectedUser
    })
    setConversations((prevConversations) => {
      if (prevConversations.some((entry) => entry.id === initialSelectedUser.id)) {
        return prevConversations
      }
      return [
        {
          id: initialSelectedUser.id,
          user: initialSelectedUser,
          lastMessageText: '',
          updatedAt: '',
          unreadCount: 0,
        },
        ...prevConversations,
      ]
    })
  }, [initialSelectedUser])

  return (
    <section className="chat-inbox-wrap">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-head">
          <h2>Inbox</h2>
          <button type="button" className="nav-link chat-new-chat-btn" onClick={() => setIsPickerOpen((prev) => !prev)}>
            New Chat
          </button>
        </div>

        {isPickerOpen && (
          <div className="chat-user-picker">
            <input
              type="text"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search users by name or email"
            />
            {isSearchingUsers && <p className="chat-meta">Searching users...</p>}
            {usersError && <p className="upload-error">{usersError}</p>}
            {!isSearchingUsers && !usersError && !userResults.length && (
              <p className="chat-meta">No users found for this search.</p>
            )}
            <ul className="chat-user-results">
              {userResults.map((user) => (
                <li key={user.id}>
                  <button type="button" className="chat-user-option" onClick={() => handleSelectUser(user)}>
                    <span className="chat-avatar">{getInitials(user.name)}</span>
                    <span className="chat-user-option-text">
                      <strong>{user.name}</strong>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isLoadingInbox && <p className="chat-meta">Loading inbox...</p>}
        {inboxError && <p className="upload-error">{inboxError}</p>}
        {!isLoadingInbox && !inboxError && !conversations.length && (
          <p className="chat-meta">No conversations yet. Start a new chat.</p>
        )}

        <ul className="chat-conversation-list">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <button
                type="button"
                className={`chat-conversation-item ${selectedUser?.id === conversation.id ? 'active' : ''}`}
                onClick={() => handleSelectUser(conversation.user)}
              >
                <span className="chat-avatar">{getInitials(conversation.user.name)}</span>
                <span className="chat-conversation-text">
                  <strong>{conversation.user.name}</strong>
                  <small>{conversation.lastMessageText || 'No messages yet'}</small>
                </span>
                <span className="chat-conversation-meta">
                  <time>{formatConversationTime(conversation.updatedAt)}</time>
                  {conversation.unreadCount > 0 && <span className="chat-unread-badge">{conversation.unreadCount}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="chat-thread">
        {!selectedUser && <p className="chat-meta">Select a conversation to start messaging.</p>}
        {selectedUser && (
          <>
            <header className="chat-thread-head">
              <div>
                <h3>{selectedConversationTitle}</h3>
              </div>
              {currentConversation?.unreadCount > 0 && (
                <span className="chat-unread-inline">{currentConversation.unreadCount} unread</span>
              )}
            </header>

            <div className="chat-message-list" role="log" aria-live="polite">
              {isLoadingMessages && <p className="chat-meta">Loading messages...</p>}
              {messagesError && <p className="upload-error">{messagesError}</p>}
              {!isLoadingMessages && !messages.length && !messagesError && <p className="chat-meta">No messages yet.</p>}

              {messages.map((message) => {
                const isOwnMessage = Boolean(
                  message.senderEmail && currentUserEmail && message.senderEmail === currentUserEmail,
                )
                return (
                  <article key={message.id} className={`chat-message ${isOwnMessage ? 'own' : ''}`}>
                    <p>{message.message}</p>
                    <div className="chat-message-meta">
                      <time>{formatConversationTime(message.createdAt)}</time>
                      {message.pending && <span>Sending...</span>}
                      {message.failed && <span className="chat-failed">Failed</span>}
                    </div>
                  </article>
                )
              })}
              <div ref={endOfMessagesRef} />
            </div>

            <form className="chat-compose" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                placeholder="Type a message"
              />
              <button type="submit" disabled={isSendingMessage || !draftMessage.trim()}>
                {isSendingMessage ? 'Sending...' : 'Send'}
              </button>
            </form>
          </>
        )}
      </section>
    </section>
  )
}

export default ChatInbox
