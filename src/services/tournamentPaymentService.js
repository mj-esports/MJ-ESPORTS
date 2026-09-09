/**
 * MJ ESPORTS — Tournament Payment Service
 * Secure client service coordinating Razorpay checkout and Supabase server verification.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Dynamically loads the Razorpay checkout script if not already present.
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => {
      console.error('[Razorpay]: Failed to load checkout script.')
      resolve(false)
    }
    document.body.appendChild(script)
  })
}

/**
 * Authoritatively requests an order from the server for the specified tournament.
 * The server inspects the database tournament record and computes the fee.
 */
export async function createTournamentOrder(tournamentId) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase client is not configured.')
  }

  const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: { tournament_id: String(tournamentId) },
  })

  if (error) {
    throw new Error(error.message || 'Failed to create payment order with server.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

/**
 * Submits the payment response to the server for HMAC-SHA256 signature verification.
 */
export async function verifyTournamentPayment({ orderId, paymentId, signature, tournamentId }) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase client is not configured.')
  }

  const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
    body: {
      order_id: orderId,
      payment_id: paymentId,
      signature,
      tournament_id: String(tournamentId),
    },
  })

  if (error) {
    throw new Error(error.message || 'Payment verification failed.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

/**
 * Launches the Razorpay checkout modal with strict callbacks.
 */
export async function launchRazorpayCheckout({
  orderData,
  tournament,
  userInfo,
  onSuccess,
  onDismiss,
  onError,
}) {
  const isScriptLoaded = await loadRazorpayScript()
  if (!isScriptLoaded || !window.Razorpay) {
    throw new Error('Could not connect to payment gateway. Please check your internet connection.')
  }

  const options = {
    key: orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_gateway',
    amount: orderData.amount, // in paise
    currency: orderData.currency || 'INR',
    name: 'MJ ESPORTS',
    description: `${tournament.title} Entry Fee`,
    order_id: orderData.order_id,
    prefill: {
      name: userInfo?.name || '',
      email: userInfo?.email || '',
      contact: userInfo?.contact || '',
    },
    theme: {
      color: '#00f2ff',
    },
    handler: async function (response) {
      try {
        if (!response.razorpay_payment_id || !response.razorpay_order_id) {
          throw new Error('Incomplete payment response from gateway.')
        }
        if (onSuccess) {
          await onSuccess({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
        }
      } catch (err) {
        if (onError) onError(err)
      }
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss()
      },
      backdropclose: false,
      escape: true,
    },
  }

  const rzpInstance = new window.Razorpay(options)
  rzpInstance.on('payment.failed', function (resp) {
    console.error('[Razorpay Payment Failed]:', resp.error)
    if (onError) {
      onError(new Error(resp.error?.description || 'Payment failed or declined by your bank.'))
    }
  })

  rzpInstance.open()
}

/**
 * Authoritatively requests tournament cancellation and player wallet refunds via RPC.
 * Only callable by administrators or service_role.
 */
export async function cancelTournamentWithRefund(tournamentId, reason = 'Tournament Cancelled by Organizer') {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase client is not configured.')
  }

  const { data, error } = await supabase.rpc('cancel_tournament_and_refund', {
    p_tournament_id: String(tournamentId),
    p_reason: String(reason || 'Tournament Cancelled by Organizer'),
  })

  if (error) {
    throw new Error(error.message || 'Failed to cancel tournament and issue refunds.')
  }

  if (data?.success === false) {
    throw new Error(data.message || 'Failed to cancel tournament.')
  }

  return data
}
