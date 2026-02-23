import { useMemo, useState } from 'react'
import useTypingIndicator from '../hooks/useTypingIndicator'

function ChatWindow({ socket, currentUserId, activeChat }) {
  const [messageInput, setMessageInput] = useState('')

  const normalizedActiveChat = useMemo(
    () =>
      activeChat
        ? {
            receiverId: activeChat.receiverId || activeChat.userId || activeChat.id || '',
            conversationId: activeChat.conversationId ?? null,
          }
        : null,
    [activeChat],
  )

  const { isPeerTyping, handleInputChange, handleInputBlur, handleMessageSent } = useTypingIndicator(
    socket,
    normalizedActiveChat,
    currentUserId,
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!messageInput.trim()) return
    handleMessageSent()
    setMessageInput('')
  }

  return (
    <section className="chat-window">
      <div className="chat-message-list" role="log" aria-live="polite">
        {isPeerTyping && (
          <article className="chat-message chat-message--typing" aria-live="polite">
            <p>Typing...</p>
          </article>
        )}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={messageInput}
          onChange={(event) => {
            const nextValue = event.target.value
            setMessageInput(nextValue)
            handleInputChange(nextValue)
          }}
          onBlur={handleInputBlur}
          placeholder="Type a message"
        />
        <button type="submit" disabled={!messageInput.trim()}>
          Send
        </button>
      </form>
    </section>
  )
}

export default ChatWindow
