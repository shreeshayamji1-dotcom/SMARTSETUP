const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const DEFAULT_TIMEOUT_MS = 18000;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY before building.'
  );
}

function headers(token, extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  };
}

function withLeadingQuestion(query = '') {
  if (!query) return '';
  return query.startsWith('?') ? query : `?${query}`;
}

export function postgrestValue(value) {
  return encodeURIComponent(String(value ?? '').trim());
}

async function parse(res) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.error || data?.details || text || 'Supabase request failed';
    const error = new Error(message);
    error.status = res.status;
    error.payload = data;
    throw error;
  }
  return data;
}

async function request(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return await parse(res);
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Supabase request timed out. Check internet, RLS policy and table availability.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const supabaseRest = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,

  async signIn(email, password) {
    return request(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: headers(null),
      body: JSON.stringify({ email, password }),
    });
  },

  async signUp(email, password, metadata = {}) {
    return request(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: headers(null),
      body: JSON.stringify({ email, password, data: metadata }),
    });
  },

  async getUser(token) {
    return request(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(token) });
  },

  async select(table, query = '', token) {
    return request(`${SUPABASE_URL}/rest/v1/${table}${withLeadingQuestion(query)}`, { headers: headers(token) });
  },

  async insert(table, rows, token, prefer = 'return=representation') {
    return request(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: headers(token, { Prefer: prefer }),
      body: JSON.stringify(rows),
    });
  },

  async upsert(table, rows, token) {
    return request(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: headers(token, { Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(rows),
    });
  },

  async update(table, values, query = '', token) {
    return request(`${SUPABASE_URL}/rest/v1/${table}${withLeadingQuestion(query)}`, {
      method: 'PATCH',
      headers: headers(token, { Prefer: 'return=representation' }),
      body: JSON.stringify(values),
    });
  },

  async rpc(functionName, params = {}, token) {
    return request(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(params),
    });
  },
};

export async function captureLead(payload) {
  const clean = {
    source_page: payload.source_page || payload.source || 'website',
    freezone_name: payload.freezone_name || null,
    name: payload.name || null,
    email: payload.email || null,
    phone_country_code: payload.phone_country_code || payload.code || null,
    phone_number: payload.phone_number || payload.phone || null,
    business_activity: payload.business_activity || payload.activity || payload.service || null,
    visa_required: payload.visa_required || payload.visas || null,
    budget: payload.budget || null,
    office_requirement: payload.office_requirement || payload.office || null,
    message: payload.message || null,
    status: payload.status || 'new',
    raw_payload: payload.raw_payload || payload,
  };
  const [row] = await supabaseRest.insert('leads', [clean]);
  return row;
}
