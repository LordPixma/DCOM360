import { Env } from './types';
import { json, buildCorsHeaders } from './utils';
import {
  createAlertSubscription,
  getAlertSubscriptions,
  updateAlertSubscription,
  deleteAlertSubscription,
  createWebhookEndpoint,
  getWebhookEndpoints,
  processAlertsForDisaster,
  processPendingAlerts,
  AlertSubscription,
  WebhookEndpoint
} from './alerts';

export async function handleAlertRoutes(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const cors = buildCorsHeaders(env, request);
  const path = url.pathname.replace('/api/alerts/', '');

  // Alert Subscriptions Management
  if (path === 'subscriptions' && request.method === 'POST') {
    try {
      const body = await request.json() as AlertSubscription;
      if (!body.user_id || !body.name) {
        return json({ success: false, error: 'user_id and name are required' }, { status: 400, headers: { ...cors } });
      }
      const result = await createAlertSubscription(env, body);
      return json(result, { headers: { ...cors } });
    } catch (e: any) {
      return json({ success: false, error: e.message }, { status: 500, headers: { ...cors } });
    }
  }

  if (path === 'subscriptions' && request.method === 'GET') {
    const userId = url.searchParams.get('user_id');
    if (!userId) {
      return json({ success: false, error: 'user_id parameter is required' }, { status: 400, headers: { ...cors } });
    }
    const result = await getAlertSubscriptions(env, userId);
    return json(result, { headers: { ...cors } });
  }

  if (path.startsWith('subscriptions/') && request.method === 'PUT') {
    try {
      const id = parseInt(path.split('/')[1]);
      const body = await request.json() as Partial<AlertSubscription>;
      const result = await updateAlertSubscription(env, id, body);
      return json(result, { headers: { ...cors } });
    } catch (e: any) {
      return json({ success: false, error: e.message }, { status: 500, headers: { ...cors } });
    }
  }

  if (path.startsWith('subscriptions/') && request.method === 'DELETE') {
    try {
      const id = parseInt(path.split('/')[1]);
      const userId = url.searchParams.get('user_id');
      if (!userId) {
        return json({ success: false, error: 'user_id parameter is required' }, { status: 400, headers: { ...cors } });
      }
      const result = await deleteAlertSubscription(env, id, userId);
      return json(result, { headers: { ...cors } });
    } catch (e: any) {
      return json({ success: false, error: e.message }, { status: 500, headers: { ...cors } });
    }
  }

  // Webhook Endpoints Management
  if (path === 'webhooks' && request.method === 'POST') {
    try {
      const body = await request.json() as WebhookEndpoint;
      if (!body.user_id || !body.name || !body.url) {
        return json({ success: false, error: 'user_id, name, and url are required' }, { status: 400, headers: { ...cors } });
      }
      const result = await createWebhookEndpoint(env, body);
      return json(result, { headers: { ...cors } });
    } catch (e: any) {
      return json({ success: false, error: e.message }, { status: 500, headers: { ...cors } });
    }
  }

  if (path === 'webhooks' && request.method === 'GET') {
    const userId = url.searchParams.get('user_id');
    if (!userId) {
      return json({ success: false, error: 'user_id parameter is required' }, { status: 400, headers: { ...cors } });
    }
    const result = await getWebhookEndpoints(env, userId);
    return json(result, { headers: { ...cors } });
  }

  // Alert Processing (internal endpoints)
  if (path === 'process' && request.method === 'POST') {
    try {
      const body = await request.json() as { disaster_id: number };
      if (!body.disaster_id) {
        return json({ success: false, error: 'disaster_id is required' }, { status: 400, headers: { ...cors } });
      }
      const result = await processAlertsForDisaster(env, body.disaster_id);
      return json(result, { headers: { ...cors } });
    } catch (e: any) {
      return json({ success: false, error: e.message }, { status: 500, headers: { ...cors } });
    }
  }

  if (path === 'queue/process' && request.method === 'POST') {
    try {
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const result = await processPendingAlerts(env, limit);
      return json(result, { headers: { ...cors } });
    } catch (e: any) {
      return json({ success: false, error: e.message }, { status: 500, headers: { ...cors } });
    }
  }

  return json({ success: false, error: 'Alert endpoint not found' }, { status: 404, headers: { ...cors } });
}