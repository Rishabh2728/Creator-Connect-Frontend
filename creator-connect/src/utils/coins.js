export const COIN_BALANCE_UPDATED_EVENT = 'coins:updated'

export const toNumber = (value, fallback = 0) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

export const resolveWalletFromResponse = (response) =>
  response?.data?.wallet || response?.wallet || response?.data || response || {}

export const resolveCoinBalance = (response, fallback = 0) => {
  const wallet = resolveWalletFromResponse(response)
  return toNumber(wallet.remainingCoins ?? wallet.coins ?? wallet.balance, fallback)
}

export const emitCoinBalanceUpdated = (balance) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(COIN_BALANCE_UPDATED_EVENT, {
      detail: { balance: toNumber(balance, 0) },
    }),
  )
}

