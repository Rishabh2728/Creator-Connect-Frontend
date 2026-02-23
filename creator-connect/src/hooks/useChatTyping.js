import useTypingIndicator from './useTypingIndicator'

function useChatTyping(socket, activeChat, currentUserId) {
  const { isPeerTyping, handleInputChange, handleInputBlur, handleMessageSent } = useTypingIndicator(
    socket,
    activeChat,
    currentUserId,
  )

  return {
    onInputChange: handleInputChange,
    onInputBlur: handleInputBlur,
    onMessageSent: handleMessageSent,
    isActiveUserTyping: isPeerTyping,
  }
}

export default useChatTyping
