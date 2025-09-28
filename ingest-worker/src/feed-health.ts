// feed-health.ts - Track health metrics for each ingestion feed
// Updates feed_health table with success/failure stats.

import { Env } from '../../worker/src/types'

export interface FeedHealthUpdateInput {
  feed_name: string
  ok: boolean
  latency_ms?: number
  error_message?: string
}

export async function updateFeedHealth(env: Env, input: FeedHealthUpdateInput) {
  const nowIso = new Date().toISOString()
  if (input.ok) {
    const sql = `INSERT INTO feed_health (feed_name, last_success, avg_latency_ms, error_count, consecutive_failures, status, notes)
      VALUES (?, ?, ?, 0, 0, 'OK', NULL)
      ON CONFLICT(feed_name) DO UPDATE SET
        last_success=excluded.last_success,
        avg_latency_ms=CASE
          WHEN feed_health.avg_latency_ms IS NULL THEN excluded.avg_latency_ms
          ELSE ROUND((feed_health.avg_latency_ms * 0.7) + (excluded.avg_latency_ms * 0.3))
        END,
        consecutive_failures=0,
        status='OK',
        updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')`
    await env.DB.prepare(sql).bind(input.feed_name, nowIso, input.latency_ms ?? null).run()
  } else {
    const sql = `INSERT INTO feed_health (feed_name, last_error, error_count, consecutive_failures, status, notes)
      VALUES (?, ?, 1, 1, 'DEGRADED', ?)
      ON CONFLICT(feed_name) DO UPDATE SET
        last_error=excluded.last_error,
        error_count=feed_health.error_count + 1,
        consecutive_failures=feed_health.consecutive_failures + 1,
        status=CASE
          WHEN (feed_health.consecutive_failures + 1) >= 5 THEN 'FAILING'
          ELSE 'DEGRADED'
        END,
        notes=excluded.notes,
        updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')`
    await env.DB.prepare(sql).bind(input.feed_name, nowIso, input.error_message || null).run()
  }
}

export async function getFeedHealth(env: Env) {
  const sql = `SELECT feed_name, last_success, last_error, error_count, avg_latency_ms, consecutive_failures, status, notes, updated_at FROM feed_health ORDER BY feed_name`
  const rows = await env.DB.prepare(sql).all()
  return rows.results || []
}
