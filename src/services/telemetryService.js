/**
 * MJ ESPORTS Production Telemetry, Analytics, and Audit Logging Service
 */

// Central Event & Telemetry Bus
class TelemetryService {
  constructor() {
    this.isProduction = import.meta.env.PROD
  }

  /**
   * Log telemetry event to console and analytics provider (e.g. Google Analytics / PostHog)
   */
  trackEvent(eventName, properties = {}) {
    const payload = {
      event: eventName,
      properties,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.pathname : '',
    }

    if (!this.isProduction) {
      console.log('[Telemetry Track]:', payload)
    }

    // Google Analytics / Window DataLayer Push if present
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push(payload)
    }
  }

  /**
   * Track error exceptions for error monitoring (e.g. Sentry / LogRocket)
   */
  logError(error, context = {}) {
    const errorPayload = {
      message: error?.message || String(error),
      code: error?.code || 'UNKNOWN_ERROR',
      stack: error?.stack || null,
      context,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    }

    console.error('[Error Monitoring Logged]:', errorPayload)

    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, { extra: context })
    }
  }

  /**
   * Log critical Admin Actions for security audit trailing
   */
  logAdminAction(actionType, targetEntity, details = {}) {
    const auditPayload = {
      action: actionType,
      target: targetEntity,
      details,
      timestamp: new Date().toISOString(),
      performedBy: details.adminId || 'current_admin',
    }

    console.info('[Admin Audit Trail Log]:', auditPayload)
    this.trackEvent(`admin_action_${actionType}`, auditPayload)
  }

  /**
   * Log Performance Metrics (Web Vitals / Latency)
   */
  logPerformanceMetric(metricName, durationMs) {
    const metricPayload = {
      metric: metricName,
      durationMs,
      timestamp: new Date().toISOString(),
    }

    if (durationMs > 1000) {
      console.warn('[Performance Slow Metric Alert]:', metricPayload)
    } else if (!this.isProduction) {
      console.log('[Performance Metric]:', metricPayload)
    }
  }
}

export const telemetry = new TelemetryService()
