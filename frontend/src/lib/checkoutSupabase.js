import { postgrestValue, supabaseRest } from './supabaseRest';

const PREBOOKING_AMOUNT_AED = 999;
const VISA_PRICE_AED = 5912;
const DEFAULT_SERVICE_FEE_AED = 1500;

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function money(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value, fallback = true) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

function cleanRow(row = {}) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [String(key).replace(/^\uFEFF/, ''), value]));
}

function firstAvailable(input, keys, fallback = null) {
  const row = cleanRow(input);
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '') return row[key];
  }
  return fallback;
}

function normalizePackage(input) {
  const row = cleanRow(input);
  const freezone = firstAvailable(row, ['freezone', 'freezone_name', 'jurisdiction', 'authority'], 'Free Zone');
  const packageName = firstAvailable(row, ['package_name', 'name', 'title', 'category'], 'Business Setup Package');
  const price = money(firstAvailable(row, ['display_price', 'offer_price', 'package_price', 'base_price', 'original_price', 'price'], 0));
  const serviceFee = money(firstAvailable(row, ['service_fee', 'svc', 'advisory_fee'], 0), 0);
  const id = firstAvailable(row, ['id', 'package_id'], `${slugify(freezone)}-${slugify(packageName)}-${price}`);

  return {
    id: String(id),
    selection_id: String(id),
    package_id: firstAvailable(row, ['package_id', 'id'], null),
    slug: firstAvailable(row, ['slug', 'freezone_slug'], slugify(freezone)),
    name: freezone,
    package_name: packageName,
    category: firstAvailable(row, ['category', 'package_type'], null),
    duration: firstAvailable(row, ['duration', 'validity'], '1 Year'),
    workspace: firstAvailable(row, ['workspace', 'office_type', 'facility'], 'Subject to authority package'),
    includes_visa: firstAvailable(row, ['includes_visa', 'visa_count', 'visas'], null),
    visa_quota: money(firstAvailable(row, ['visa_count', 'visas', 'max_visas'], firstAvailable(row, ['includes_visa'], 0)), 0),
    gov: price,
    svc: serviceFee,
    currency: firstAvailable(row, ['currency'], 'AED'),
    is_active: bool(firstAvailable(row, ['is_active', 'active'], true), true),
    source: 'supabase',
    raw: row,
  };
}

function normalizeAddon(input) {
  const row = cleanRow(input);
  const name = firstAvailable(row, ['addon_name', 'name', 'label', 'title'], 'Service Add-on');
  const id = firstAvailable(row, ['id', 'addon_id'], slugify(name));
  return {
    id: String(id),
    addon_id: firstAvailable(row, ['addon_id', 'id'], null),
    label: name,
    price: money(firstAvailable(row, ['price', 'display_price', 'amount'], 0)),
    unit: firstAvailable(row, ['unit'], 'one-time'),
    addon_category: firstAvailable(row, ['addon_category', 'category'], null),
    notes: firstAvailable(row, ['notes', 'description'], ''),
    freezone: firstAvailable(row, ['freezone', 'freezone_name'], null),
    is_active: bool(firstAvailable(row, ['is_active', 'active'], true), true),
    source: 'supabase',
    raw: row,
  };
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function selectFirstWorkingTable(candidates) {
  let lastError = null;
  for (const { table, query, normalize } of candidates) {
    try {
      const rows = await supabaseRest.select(table, query);
      return { table, rows: (rows || []).map(normalize).filter((row) => row.is_active !== false) };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Supabase pricing table not available');
}

export async function loadCheckoutPricing() {
  const [packagesResult, addonsResult] = await Promise.all([
    selectFirstWorkingTable([
      { table: 'checkout_package_options', query: '?select=*', normalize: normalizePackage },
      { table: 'freezone_packages', query: '?select=*&is_active=eq.true', normalize: normalizePackage },
      { table: 'freezone_packages', query: '?select=*', normalize: normalizePackage },
    ]),
    selectFirstWorkingTable([
      { table: 'checkout_addon_options', query: '?select=*', normalize: normalizeAddon },
      { table: 'service_addons', query: '?select=*&is_active=eq.true', normalize: normalizeAddon },
      { table: 'service_addons', query: '?select=*', normalize: normalizeAddon },
      { table: 'package_addons', query: '?select=*&is_active=eq.true', normalize: normalizeAddon },
      { table: 'package_addons', query: '?select=*', normalize: normalizeAddon },
    ]).catch(() => ({ table: null, rows: [] })),
  ]);

  const zones = uniqueBy(packagesResult.rows, (item) => item.package_id || item.selection_id);
  if (!zones.length) throw new Error('No live Supabase checkout packages returned. Check checkout_package_options/freezone_packages policies and data.');

  return {
    zones,
    addons: uniqueBy(addonsResult.rows, (item) => item.addon_id || item.id),
    packageSourceTable: packagesResult.table,
    addonSourceTable: addonsResult.table,
  };
}

function buildOrderReference() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SSU-${date}-${suffix}`;
}

function buildOrderPayload(draft, totalAed, user) {
  const reference = buildOrderReference();
  const contact = draft.contact || {};
  const business = draft.business || {};

  return {
    reference,
    user_id: user?.id || null,
    customer_name: contact.name || null,
    customer_email: contact.email || null,
    customer_phone: contact.phone ? `${contact.phone_code || ''} ${contact.phone}`.trim() : null,
    freezone: draft.zone_name || null,
    freezone_slug: draft.zone_slug || null,
    package_id: draft.package_id || null,
    package_name: draft.package_name || null,
    visa_count: money(draft.visa_count, 0),
    office_type: draft.office_type || null,
    business_activity: business.activity || null,
    company_names: (business.company_names || []).filter(Boolean),
    shareholders: money(business.shareholders, 1),
    total_aed: money(totalAed, 0),
    prebooking_amount_aed: PREBOOKING_AMOUNT_AED,
    payment_status: 'pending',
    status: 'draft',
    source: 'website_checkout',
    raw_payload: draft,
  };
}

async function insertFirstAccepted(table, candidates) {
  let lastError = null;
  for (const payload of candidates) {
    try {
      const rows = await supabaseRest.insert(table, [payload]);
      if (rows?.[0]) return rows[0];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`Could not insert into ${table}`);
}

function buildOrderInsertCandidates(fullPayload) {
  const raw = fullPayload.raw_payload || {};
  return [
    fullPayload,
    {
      reference: fullPayload.reference,
      user_id: fullPayload.user_id,
      customer_name: fullPayload.customer_name,
      customer_email: fullPayload.customer_email,
      customer_phone: fullPayload.customer_phone,
      freezone: fullPayload.freezone,
      package_id: fullPayload.package_id,
      package_name: fullPayload.package_name,
      total_aed: fullPayload.total_aed,
      prebooking_amount_aed: fullPayload.prebooking_amount_aed,
      payment_status: fullPayload.payment_status,
      status: fullPayload.status,
      source: fullPayload.source,
      raw_payload: raw,
    },
    {
      reference: fullPayload.reference,
      customer_name: fullPayload.customer_name,
      customer_email: fullPayload.customer_email,
      customer_phone: fullPayload.customer_phone,
      freezone: fullPayload.freezone,
      package_name: fullPayload.package_name,
      total_aed: fullPayload.total_aed,
      payment_status: fullPayload.payment_status,
      status: fullPayload.status,
      raw_payload: raw,
    },
  ];
}

function buildAddonInsertCandidates(orderId, addon) {
  return [
    {
      order_id: orderId,
      addon_id: addon.addon_id || addon.id || null,
      addon_name: addon.label || addon.addon_name || 'Add-on',
      price: money(addon.price, 0),
      quantity: 1,
      raw_payload: addon,
    },
    {
      order_id: orderId,
      addon_name: addon.label || addon.addon_name || 'Add-on',
      price: money(addon.price, 0),
      quantity: 1,
    },
  ];
}

async function recalculateOrder(orderId) {
  const attempts = [
    () => supabaseRest.rpc('recalculate_checkout_order', { order_id: orderId }),
    () => supabaseRest.rpc('recalculate_checkout_order', { p_order_id: orderId }),
  ];
  let lastError = null;
  for (const attempt of attempts) {
    try { return await attempt(); } catch (error) { lastError = error; }
  }
  throw lastError || new Error('Could not recalculate checkout order');
}

export async function createCheckoutOrder(draft, totalAed, user) {
  const orderPayload = buildOrderPayload(draft, totalAed, user);
  const order = await insertFirstAccepted('checkout_orders', buildOrderInsertCandidates(orderPayload));
  if (!order?.id) throw new Error('Supabase order insert did not return an order id. Check checkout_orders insert policy and return=representation.');

  for (const addon of draft.addons || []) {
    await insertFirstAccepted('checkout_order_addons', buildAddonInsertCandidates(order.id, addon));
  }

  try {
    await recalculateOrder(order.id);
  } catch (error) {
    console.warn('[checkout] Order saved but recalculation failed:', error.message);
  }

  return {
    ...order,
    reference: order.reference || orderPayload.reference,
    claim_token: order.claim_token || null,
  };
}

export async function markBankTransferSubmitted(order, bankProof) {
  const query = `?id=eq.${postgrestValue(order.id)}`;
  const candidates = [
    {
      payment_method: 'bank_transfer',
      payment_status: 'proof_submitted',
      status: 'payment_review',
      bank_reference: bankProof.reference || order.reference,
      bank_payer_name: bankProof.payer_name || null,
      bank_receipt_file_name: bankProof.file_name || null,
      bank_receipt_content_type: bankProof.content_type || null,
      bank_receipt_base64: bankProof.file_base64 || null,
    },
    {
      payment_status: 'proof_submitted',
      status: 'payment_review',
      bank_reference: bankProof.reference || order.reference,
      bank_payer_name: bankProof.payer_name || null,
    },
    {
      payment_status: 'proof_submitted',
      status: 'payment_review',
    },
  ];
  let lastError = null;
  for (const payload of candidates) {
    try { return await supabaseRest.update('checkout_orders', payload, query); } catch (error) { lastError = error; }
  }
  throw lastError || new Error('Could not update bank transfer proof');
}

export function getPrebookingAmount() {
  return PREBOOKING_AMOUNT_AED;
}

export function getVisaPrice() {
  return VISA_PRICE_AED;
}

export function getDefaultServiceFee() {
  return DEFAULT_SERVICE_FEE_AED;
}
