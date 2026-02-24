import { useCallback, useEffect, useState } from 'react'
import { getCoinWallet } from '../api/coinsApi'
import { COIN_BALANCE_UPDATED_EVENT, resolveCoinBalance, toNumber } from '../utils/coins'

function useCoinWallet(token, options = {}) {
  const { enabled = true, pollIntervalMs = 12000 } = options
  const [coinBalance, setCoinBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const resolvedToken = token || localStorage.getItem('token') || localStorage.getItem('auth_token') || ''

  const refreshWallet = useCallback(async () => {
    if (!enabled || !resolvedToken) {
      setCoinBalance(0)
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const response = await getCoinWallet(resolvedToken)
      setCoinBalance(resolveCoinBalance(response, 0))
    } catch (refreshError) {
      setError(refreshError?.message || 'Could not fetch coin wallet')
    } finally {
      setIsLoading(false)
    }
  }, [enabled, resolvedToken])

  useEffect(() => {
    refreshWallet()
  }, [refreshWallet])

  useEffect(() => {
    if (!enabled || !resolvedToken || pollIntervalMs <= 0) return undefined
    const intervalId = window.setInterval(refreshWallet, pollIntervalMs)
    return () => window.clearInterval(intervalId)
  }, [enabled, pollIntervalMs, refreshWallet, resolvedToken])

  useEffect(() => {
    if (!enabled || !resolvedToken) return undefined

    const handleFocus = () => refreshWallet()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshWallet()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, refreshWallet, resolvedToken])

  useEffect(() => {
    const handleBalanceEvent = (event) => {
      setCoinBalance((previous) => toNumber(event?.detail?.balance, previous))
    }

    window.addEventListener(COIN_BALANCE_UPDATED_EVENT, handleBalanceEvent)
    return () => window.removeEventListener(COIN_BALANCE_UPDATED_EVENT, handleBalanceEvent)
  }, [])

  return {
    coinBalance,
    isLoading,
    error,
    refreshWallet,
    setCoinBalance,
  }
}

export default useCoinWallet

