import { useState } from 'react'
import { createRazorpayOrder, verifyRazorpayPayment } from '../api/coinsApi'
import { COIN_PLANS } from '../constants/coinPlans'
import { emitCoinBalanceUpdated, resolveCoinBalance } from '../utils/coins'

const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-script'
const RAZORPAY_CHECKOUT_JS_URL = 'https://checkout.razorpay.com/v1/checkout.js'

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

function PlansPage({ token, currentUserName = '', currentUserEmail = '', coinBalance = 0, refreshWallet }) {
  const [walletError, setWalletError] = useState('')
  const [walletMessage, setWalletMessage] = useState('')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [processingPlanId, setProcessingPlanId] = useState('')
  const resolvedToken = token || localStorage.getItem('token') || localStorage.getItem('auth_token') || ''
  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || ''

  const handlePurchasePlan = async (plan) => {
    if (!resolvedToken || !plan || isProcessingPayment) return
    setWalletError('')
    setWalletMessage('')

    if (!razorpayKeyId) {
      setWalletError('Missing Razorpay key. Set VITE_RAZORPAY_KEY_ID in frontend environment.')
      return
    }

    setIsProcessingPayment(true)
    setProcessingPlanId(plan.id)

    try {
      const scriptReady = await loadRazorpayCheckoutScript()
      if (!scriptReady || !window.Razorpay) {
        throw new Error('Could not load Razorpay checkout. Please check your connection and try again.')
      }

      const orderResponse = await createRazorpayOrder(resolvedToken, {
        planId: plan.id,
        amountInRupees: plan.amountInRupees,
        baseCoins: plan.baseCoins,
        bonusCoins: plan.bonusCoins,
      })
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
        notes: {
          planId: plan.id,
        },
        theme: {
          color: '#7b2437',
        },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await verifyRazorpayPayment(resolvedToken, {
              planId: plan.id,
              razorpay_order_id: paymentResponse?.razorpay_order_id,
              razorpay_payment_id: paymentResponse?.razorpay_payment_id,
              razorpay_signature: paymentResponse?.razorpay_signature,
            })
            const nextBalance = resolveCoinBalance(verifyResponse, coinBalance)
            emitCoinBalanceUpdated(nextBalance)
            await refreshWallet?.()
            setWalletMessage('Payment successful. Coins added to your wallet.')
            setWalletError('')
          } catch (error) {
            setWalletError(error?.message || 'Payment verification failed. Contact support if money was debited.')
          } finally {
            setIsProcessingPayment(false)
            setProcessingPlanId('')
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false)
            setProcessingPlanId('')
          },
        },
      })

      checkout.open()
    } catch (error) {
      setWalletError(error?.message || 'Could not start payment')
      setIsProcessingPayment(false)
      setProcessingPlanId('')
    }
  }

  return (
    <section className="content-card plans-page">
      <header className="plans-header">
        <div>
          <h2>Coin Plans</h2>
          <p>1 Coin = 1 Message</p>
        </div>
        <div className="plans-balance-panel" aria-live="polite">
          <span>Available Coins</span>
          <strong>{coinBalance}</strong>
        </div>
      </header>

      <p className="plans-meta">1 message = 1 coin. New users get a one-time welcome coin bonus from backend.</p>
      {walletError && <p className="upload-error">{walletError}</p>}
      {walletMessage && <p className="coin-wallet-success">{walletMessage}</p>}

      <div className="plans-grid">
        {COIN_PLANS.map((plan) => {
          const totalCoins = plan.baseCoins + plan.bonusCoins
          const isCurrentPlanLoading = isProcessingPayment && processingPlanId === plan.id
          return (
            <article key={plan.id} className="plan-card-pro">
              <p className="plan-badge">{plan.label}</p>
              <h3>Rs {plan.amountInRupees}</h3>
              <p className="plan-coins-main">{totalCoins} Coins</p>
              <p className="plan-coins-sub">
                {plan.baseCoins} base + {plan.bonusCoins} bonus
              </p>
              <button
                type="button"
                className="coin-plan-buy"
                onClick={() => handlePurchasePlan(plan)}
                disabled={isProcessingPayment}
              >
                {isCurrentPlanLoading ? 'Processing...' : 'Buy Plan'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default PlansPage

