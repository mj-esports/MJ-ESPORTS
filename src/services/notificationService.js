import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

export async function fetchUserNotifications(userId) {
  if (!isSupabaseConfigured || !userId) return []
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

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
          type, // 'info' | 'success' | 'warning' | 'error' | 'payment' | 'room' | 'prize'
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

export async function markNotificationAsRead(notificationId) {
  if (!isSupabaseConfigured || !notificationId) return false
  try {
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
