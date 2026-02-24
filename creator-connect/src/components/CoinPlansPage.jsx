import { useState } from 'react'
import { createRazorpayOrder, verifyRazorpayPayment } from '../api/coinsApi'

const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-script'
const RAZORPAY_CHECKOUT_JS_URL = 'https://checkout.razorpay.com/v1/checkout.js'

const COIN_PLANS = [
  {
    id: 'coins-199',
    name: 'Starter',
    amountInRupees: 199,
    baseCoins: 200,
    bonusCoins: 20,
    tagline: 'For daily chats',
  },
  {
    id: 'coins-399',
    name: 'Growth',
    amountInRupees: 399,
    baseCoins: 450,
    bonusCoins: 60,
    tagline: 'Best for active creators',
    featured: true,
  },
  {
    id: 'coins-599',
    name: 'Pro',
    amountInRupees: 599,
    baseCoins: 750,
    bonusCoins: 150,
    tagline: 'High-volume messaging',
  },
]

const loadRazorpayCheckoutScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true })
      existingScript.addEventListener('error', () => resolve(false), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = RAZORPAY_SCRIPT_ID
    script.src = RAZORPAY_CHECKOUT_JS_URL
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

function CoinPlansPage({
  token = '',
  currentUserEmail = '',
  currentUserName = '',
  coinBalance = 0,
  onWalletRefresh,
  onCoinBalanceChange,
}) {
  const [paymentError, setPaymentError] = useState('')
  const [paymentMessage, setPaymentMessage] = useState('')
  const [processingPlanId, setProcessingPlanId] = useState('')

  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || ''
  const resolvedToken = token || localStorage.getItem('token') || localStorage.getItem('auth_token') || ''

  const handleBuyPlan = async (plan) => {
    if (!resolvedToken || !plan || processingPlanId) return
    setPaymentError('')
    setPaymentMessage('')

    if (!razorpayKeyId) {
      setPaymentError('Missing Razorpay key. Set VITE_RAZORPAY_KEY_ID in frontend environment.')
      return
    }

    setProcessingPlanId(plan.id)
    try {
      const scriptReady = await loadRazorpayCheckoutScript()
      if (!scriptReady || !window.Razorpay) {
        throw new Error('Could not load Razorpay checkout. Please check your connection and try again.')
      }

      const orderResponse = await createRazorpayOrder(resolvedToken, { planId: plan.id })
      const order = orderResponse?.data?.order || orderResponse?.order || orderResponse?.data || {}
      if (!order.id || !order.amount || !order.currency) {
        throw new Error('Invalid order payload from backend. Missing order id/amount/currency.')
      }

      const checkout = new window.Razorpay({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Creator Connect',
        description: `${plan.baseCoins + plan.bonusCoins} coins plan`,
        order_id: order.id,
        prefill: {
          name: currentUserName || undefined,
          email: currentUserEmail || undefined,
        },
        notes: { planId: plan.id },
        theme: { color: '#7b2437' },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await verifyRazorpayPayment(resolvedToken, {
              planId: plan.id,
              razorpay_order_id: paymentResponse?.razorpay_order_id,
              razorpay_payment_id: paymentResponse?.razorpay_payment_id,
              razorpay_signature: paymentResponse?.razorpay_signature,
            })
            const wallet = verifyResponse?.data?.wallet || verifyResponse?.wallet || {}
            const nextCoins = Number(wallet.remainingCoins ?? wallet.coins ?? wallet.balance)
            if (Number.isFinite(nextCoins)) {
              onCoinBalanceChange?.(nextCoins)
            } else {
              onWalletRefresh?.()
            }
            setPaymentMessage('Payment successful. Coins added to your wallet.')
            setPaymentError('')
          } catch (error) {
            setPaymentError(error?.message || 'Payment verification failed.')
          } finally {
            setProcessingPlanId('')
          }
        },
        modal: {
          ondismiss: () => setProcessingPlanId(''),
        },
      })

      checkout.open()
    } catch (error) {
      setPaymentError(error?.message || 'Could not start payment')
      setProcessingPlanId('')
    }
  }

  return (
    <section className="coin-page">
      <header className="coin-page-hero">
        <div>
          <p className="coin-hero-kicker">Wallet</p>
          <h2>Upgrade Your Coins</h2>
          <p className="coin-hero-copy">1 Coin = 1 Message</p>
        </div>
        <div className="coin-balance-card" aria-live="polite">
          <p>Available Coins</p>
          <strong>{coinBalance}</strong>
        </div>
      </header>

      {paymentError && <p className="upload-error">{paymentError}</p>}
      {paymentMessage && <p className="coin-wallet-success">{paymentMessage}</p>}

      <div className="coin-page-grid">
        {COIN_PLANS.map((plan) => {
          const totalCoins = plan.baseCoins + plan.bonusCoins
          const isBusy = processingPlanId === plan.id
          return (
            <article key={plan.id} className={`coin-page-card ${plan.featured ? 'featured' : ''}`}>
              <p className="coin-page-name">{plan.name}</p>
              <p className="coin-page-tagline">{plan.tagline}</p>
              <p className="coin-page-price">Rs {plan.amountInRupees}</p>
              <p className="coin-page-total">{totalCoins} Coins Total</p>
              <p className="coin-page-breakdown">
                {plan.baseCoins} base + {plan.bonusCoins} bonus
              </p>
              <button type="button" className="coin-page-buy" onClick={() => handleBuyPlan(plan)} disabled={Boolean(processingPlanId)}>
                {isBusy ? 'Processing...' : 'Buy Now'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default CoinPlansPage
