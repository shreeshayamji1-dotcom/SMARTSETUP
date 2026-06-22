import { captureLead, supabaseRest } from './supabaseRest';

const ACTIVITY_COLUMNS = 'id,freezone,activity_name,activity_code,industry_group,keywords,is_active';
const FALLBACK_RECOMMENDATIONS = ['Meydan FZ', 'IFZA Dubai', 'SPC Free Zone'];

function escapeLike(value = '') {
  return String(value).trim().replace(/[%,()]/g, ' ');
}

export function normalizeActivity(row = {}) {
  return {
    id: row.id || `${row.freezone || 'uae'}-${row.activity_code || row.activity_name}`,
    freezone: row.freezone || 'Mainland',
    activity_name: row.activity_name || row.name || row.activity || '',
    activity_code: row.activity_code || row.code || '',
    industry_group: row.industry_group || '',
    keywords: row.keywords || '',
    is_active: row.is_active !== false,
  };
}

export async function searchActivities(term, { freezone, limit = 20 } = {}) {
  const cleaned = escapeLike(term);
  const filters = ['is_active=eq.true'];

  if (freezone && freezone !== 'All') {
    filters.push(`freezone=ilike.*${encodeURIComponent(freezone)}*`);
  }

  if (cleaned) {
    const q = encodeURIComponent(`*${cleaned}*`);
    filters.push(`or=(activity_name.ilike.${q},activity_code.ilike.${q},industry_group.ilike.${q},keywords.ilike.${q})`);
  }

  const query = `?select=${ACTIVITY_COLUMNS}&${filters.join('&')}&order=activity_name.asc&limit=${limit}`;
  const data = await supabaseRest.select('activities_master', query);
  return (data || []).map(normalizeActivity);
}

export function buildRecommendation(activity) {
  const row = normalizeActivity(activity);
  const freezone = row.freezone && row.freezone !== 'All' ? row.freezone : 'Meydan FZ';
  const lower = `${row.activity_name} ${row.keywords} ${row.industry_group}`.toLowerCase();

  let bestZone = freezone;
  let cost = 'AED 12,500';
  let processingTime = '2–3 weeks';
  let alternatives = FALLBACK_RECOMMENDATIONS.filter((z) => z !== bestZone).slice(0, 2);

  if (lower.includes('media') || lower.includes('publishing')) {
    bestZone = row.freezone || 'SPC Free Zone';
    alternatives = ['SHAMS', 'Meydan FZ'];
    cost = 'AED 6,875';
  } else if (lower.includes('trading') || lower.includes('e-commerce') || lower.includes('ecommerce')) {
    bestZone = row.freezone || 'Meydan FZ';
    alternatives = ['IFZA Dubai', 'RAKEZ'];
    cost = 'AED 12,500';
  } else if (lower.includes('consult') || lower.includes('software') || lower.includes('it')) {
    bestZone = row.freezone || 'Meydan FZ';
    alternatives = ['IFZA Dubai', 'SPC Free Zone'];
    cost = 'AED 12,500';
  }

  return {
    activity: row.activity_name,
    activityCode: row.activity_code,
    industryGroup: row.industry_group,
    bestZone,
    cost,
    processingTime,
    matchScore: row.freezone ? 95 : 88,
    alternatives,
    raw: row,
  };
}

export async function captureAILead(form, recommendation, sourceCta = 'ai_search_start_application') {
  return captureLead({
    source_page: sourceCta,
    name: form.name,
    email: form.email,
    phone_country_code: form.countryCode,
    phone_number: form.phone,
    whatsapp: form.whatsapp || form.phone,
    nationality: form.nationality,
    residence_country: form.residenceCountry,
    business_activity: recommendation?.activity,
    activity_code: recommendation?.activityCode,
    freezone_name: recommendation?.bestZone,
    selected_freezone: recommendation?.bestZone,
    selected_activity: recommendation?.activity,
    industry_group: recommendation?.industryGroup,
    message: `AI Search lead: ${recommendation?.activity || ''} → ${recommendation?.bestZone || ''}`,
    raw_payload: { form, recommendation },
  });
}
