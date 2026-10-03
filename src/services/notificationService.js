import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

// Active channel cache to prevent duplicate subscription channels per user
const activeNotificationChannels = new Map()

/**
 * Fetches recent notifications for a user, ordered newest-first with a sensible limit.
 *
 * @param {string} userId - Target user UUID
 * @param {object} [options]
 * @param {number} [options.limit=30] - Maximum number of notifications to return
 * @returns {Promise<Array>} List of notification records
 */
export async function fetchUserNotifications(userId, options = {}) {
  if (!isSupabaseConfigured || !userId) return []
  const limit = options?.limit || 30

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[notificationService] fetch error:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[notificationService] exception:', err)
    return []
  }
}

/**
 * Returns the authoritative count of unread notifications for a user using a lightweight HEAD query.
 *
 * @param {string} userId - Target user UUID
 * @returns {Promise<number>} Unread notification count
 */
export async function getUnreadNotificationCount(userId) {
  if (!isSupabaseConfigured || !userId) return 0

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.warn('[notificationService] count error:', error.message)
      return 0
    }
    return count || 0
  } catch (err) {
    console.warn('[notificationService] count exception:', err)
    return 0
  }
}

/**
 * Creates and dispatches a notification to a specific user.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.type='info'] - 'info' | 'success' | 'warning' | 'error' | 'payment' | 'room' | 'prize'
 * @param {string} [params.link=null]
 * @returns {Promise<object|null>} Inserted notification row
 */
export async function createNotification({ userId, title, message, type = 'info', link = null }) {
  if (!isSupabaseConfigured || !userId) return null
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          title,
          message,
          type,
          is_read: false,
          link,
        },
      ])
      .select('*')
      .single()

    if (error) {
      console.error('[notificationService] create error:', error)
      return null
    }
    return data
  } catch (err) {
    console.error('[notificationService] exception:', err)
    return null
  }
}

/**
 * Marks a single notification as read.
 * Attempts authoritative SECURITY DEFINER RPC first, with direct table update fallback.
 *
 * @param {string} notificationId - Notification UUID
 * @returns {Promise<boolean>} Success status
 */
export async function markNotificationAsRead(notificationId) {
  if (!isSupabaseConfigured || !notificationId) return false

  try {
    // 1. Authoritative RPC path
    const { data: rpcData, error: rpcErr } = await supabase.rpc('mark_notification_as_read', {
      p_notification_id: notificationId,
    })

    if (!rpcErr && typeof rpcData === 'boolean') {
      return rpcData
    }

    // 2. Direct table fallback if RPC is not yet deployed
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('[notificationService] markAsRead error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[notificationService] exception:', err)
    return false
  }
}

/**
 * Marks all unread notifications for a user as read in a single batch operation.
 * Prevents multiple individual HTTP queries per notification.
 *
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<{ success: boolean, count?: number, error?: string }>}
 */
export async function markAllNotificationsAsRead(userId) {
  if (!isSupabaseConfigured || !userId) {
    return { success: false, error: 'Supabase is not configured or user ID is missing.' }
  }

  try {
    // 1. Authoritative batch RPC
    const { data: rpcData, error: rpcErr } = await supabase.rpc('mark_notifications_read', {
      p_user_id: userId,
    })

    if (!rpcErr && rpcData?.success) {
      return { success: true, count: rpcData.count || 0 }
    }

    // 2. Single batch update fallback
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select('id')

    if (error) {
      console.error('[notificationService] markAllAsRead error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, count: data?.length || 0 }
  } catch (err) {
    console.error('[notificationService] markAllAsRead exception:', err)
    return { success: false, error: err.message || 'Batch mark read failed.' }
  }
}

/**
 * Subscribes to real-time notification events for a specific user using Supabase Realtime.
 * Strictly filters by user_id and listens for INSERT events.
 *
 * @param {string} userId - Authenticated user UUID
 * @param {function} callback - Invoked when a new notification is inserted
 * @returns {function} Unsubscribe cleanup function
 */
export function subscribeToUserNotifications(userId, callback) {
  if (!isSupabaseConfigured || !userId || typeof callback !== 'function') {
    return () => {}
  }

  // Prevent duplicate subscriptions for the same user
  const channelKey = `user_notifications_${userId}`
  if (activeNotificationChannels.has(channelKey)) {
    const existing = activeNotificationChannels.get(channelKey)
    try {
      supabase.removeChannel(existing)
    } catch (e) {
      console.warn('[notificationService] cleanup existing channel warn:', e)
    }
    activeNotificationChannels.delete(channelKey)
  }

  const channel = supabase
    .channel(channelKey)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload?.new) {
          callback(payload.new)
        }
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.warn(`[notificationService] Realtime subscription notice (${status}):`, err.message)
      }
    })

  activeNotificationChannels.set(channelKey, channel)

  // Return safe cleanup function
  return () => {
    try {
      supabase.removeChannel(channel)
    } catch (e) {
      console.warn('[notificationService] removeChannel error:', e)
    } finally {
      if (activeNotificationChannels.get(channelKey) === channel) {
        activeNotificationChannels.delete(channelKey)
      }
    }
  }
}
