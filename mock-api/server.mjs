// dito-api: a local stand-in for the Redpay API, used by staging so nothing touches real data.
// Plain Node (no dependencies). Data lives in memory and is saved to DATA_FILE, so edits survive restarts.
// New transactions keep arriving every few seconds so Monitoring looks live.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const PORT = Number(process.env.PORT || 8081)
const DATA_FILE = process.env.DATA_FILE || '/data/db.json'
const DAYS = 3

const STATUS = { success: 1000, pending: 1001, waiting: 1003, failed: 1005 }
const STATUS_NAME = { 1000: 'success', 1001: 'pending', 1003: 'pending', 1005: 'failed' }
const DENOMS = [5000, 10000, 10000, 20000, 25000, 50000, 100000]
const PM = [
  { slug: 'dana', route: 'dana', weight: 30 },
  { slug: 'qris', route: 'qris_harsya', weight: 22 },
  { slug: 'gopay', route: 'midtrans', weight: 14 },
  { slug: 'telkomsel_airtime', route: 'telkomsel_dcb', weight: 12 },
  { slug: 'ovo', route: 'ovo', weight: 8 },
  { slug: 'xl_airtime', route: 'xl_dcb', weight: 6 },
  { slug: 'shopeepay', route: 'midtrans', weight: 5 },
  { slug: 'va_bca', route: 'bca', weight: 3 },
]
const MERCHANT_NAMES = [
  ['Nusantara Games', 'Royal Nusantara', 30],
  ['Kopi Digital Indonesia', 'Kopi Points', 18],
  ['Bintang Media Kreatif', 'Bintang Stream', 14],
  ['Arunika Studio', 'Arunika Play', 12],
  ['Teras Edukasi', 'Teras Belajar', 9],
  ['Sinar Voucher Nusantara', 'Sinar Voucher', 8],
  ['Kirana Komik', 'Kirana Reader', 6],
  ['Lentera Musik', 'Lentera Tunes', 3], // goes quiet near "now", so the stop alert has something to show
]

// ---------- helpers ----------
let seed = 20261112
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const pick = (list, w = (x) => x.weight ?? 1) => {
  const total = list.reduce((s, x) => s + w(x), 0)
  let r = rand() * total
  for (const x of list) if ((r -= w(x)) <= 0) return x
  return list[list.length - 1]
}
const uuid = () => crypto.randomUUID()
const hex = (n) => crypto.randomBytes(n).toString('hex')
const iso = (ms) => new Date(ms).toISOString()
const msisdn = () => '628' + String(1 + Math.floor(rand() * 9)) + String(Math.floor(rand() * 1e9)).padStart(9, '0')
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const parseTime = (v, fallback) => {
  if (!v) return fallback
  const t = Date.parse(v)
  return Number.isNaN(t) ? fallback : t
}

// ---------- data ----------
function makeMerchant([name, app, weight], i) {
  const now = new Date().toISOString()
  const id = i + 1
  const pms = PM.filter((_, j) => (i + j) % 3 !== 2)
  return {
    u_id: uuid(),
    client_name: name,
    client_appkey: hex(16),
    client_secret: hex(16),
    client_appid: hex(8),
    app_name: app,
    address: `Jl. Contoh No. ${10 + i}, Jakarta`,
    mobile: true,
    client_status: 1,
    phone: `0812${String(1000000 + i * 7919).slice(0, 7)}`,
    email: `ops@${name.toLowerCase().replace(/[^a-z]+/g, '')}.test`,
    testing: 0,
    lang: 'id',
    callback_url: `https://${name.toLowerCase().replace(/[^a-z]+/g, '')}.test/callback`,
    fail_callback: `https://${name.toLowerCase().replace(/[^a-z]+/g, '')}.test/callback/fail`,
    isdcb: true,
    whitelisted_ips: '10.0.0.1, 10.0.0.2',
    weight,
    updated_at: now,
    created_at: now,
    payment_methods: pms.map((p, j) => ({ id: id * 100 + j, name: p.slug, route: [p.route], flexible: true, status: 1, msisdn: 0, client_id: id })),
    settlements: pms.map((p, j) => ({
      id: id * 100 + j, client_id: id, name: p.slug, is_bhpuso: 1, servicecharge: 0, tax23: 2, ppn: 11, mdr: 3.5, mdr_type: 'percent',
      additionalfee: 0, additional_percent: 0, additionalfee_type: 'flat', payment_type: 'ewallet', share_redision: 30, share_partner: 70,
      is_divide_1poin1: 0, updated_at: now, created_at: now,
    })),
    apps: [{ id: id * 10, app_name: app, appid: hex(8), appkey: hex(16), callback_url: `https://${app.toLowerCase().replace(/[^a-z]+/g, '')}.test/cb`, testing: 0, status: 1, mobile: true, fail_callback: '', client_id: id, created_at: now, updated_at: now }],
    route_weights: pms.map((p, j) => ({ id: id * 100 + j, client_id: id, payment_method: p.slug, route: p.route, weight: 100, created_at: now, updated_at: now })),
  }
}

function makeTrx(m, at) {
  const pmSlugs = m.payment_methods.map((p) => p.name)
  const p = pick(PM.filter((x) => pmSlugs.includes(x.slug)))
  const r = rand()
  const status = r < 0.82 ? STATUS.success : r < 0.91 ? STATUS.pending : r < 0.93 ? STATUS.waiting : STATUS.failed
  const amount = DENOMS[Math.floor(rand() * DENOMS.length)]
  const app = m.apps[0]
  return {
    u_id: uuid(),
    user_mdn: msisdn(),
    user_id: 'user' + Math.floor(rand() * 90000 + 10000),
    payment_method: p.slug,
    status_code: status,
    created_at: iso(at),
    updated_at: iso(at + 4000),
    merchant_transaction_id: 'MT' + Math.floor(at / 1000) + Math.floor(rand() * 1000),
    currency: 'IDR',
    amount,
    price: amount,
    item_name: `Diamond ${amount / 1000}`,
    item_id: 'ITEM' + amount,
    client_appkey: app.appkey,
    testing: false,
    appid: app.appid,
    merchant_name: m.client_name,
    app_name: app.app_name,
    route: p.route,
    user_ip: '10.1.' + Math.floor(rand() * 255) + '.' + Math.floor(rand() * 255),
    fail_reason: status === STATUS.failed ? 'Insufficient balance' : '',
    va_bca: p.slug === 'va_bca' ? '8808' + Math.floor(rand() * 1e8) : '',
    ximpay_id: '',
    reference_id: 'REF' + hex(6),
    midtrans_transaction_id: ['gopay', 'qris', 'shopeepay'].includes(p.slug) ? uuid() : '',
    otp: p.slug === 'telkomsel_airtime' ? String(Math.floor(rand() * 900000 + 100000)) : '',
    timestamp_request_date: iso(at),
    receive_callback_date: status === STATUS.success ? iso(at + 3000) : null,
    timestamp_submit_date: iso(at + 1000),
    timestamp_callback_date: status === STATUS.success ? iso(at + 4000) : null,
    timestamp_callback_result: status === STATUS.success || status === STATUS.waiting ? 'ok' : '',
  }
}

function seedData() {
  const merchants = MERCHANT_NAMES.map(makeMerchant)
  const trx = []
  const end = Date.now()
  for (let t = end - DAYS * 864e5; t < end; ) {
    const hour = new Date(t).getHours()
    // Busier in the day, quiet at night: one transaction every ~6s at noon, every ~40s at 3am.
    const gap = hour >= 9 && hour <= 22 ? 6000 : 40000
    t += gap * (0.5 + rand())
    const m = pick(merchants)
    if (m === merchants[7] && end - t < 25 * 60e3) continue
    trx.push(makeTrx(m, t))
  }
  return { merchants, trx: trx.reverse() } // newest first, as the real API pages them
}

let db
try {
  db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  console.log(`loaded ${db.trx.length} transactions from ${DATA_FILE}`)
} catch {
  db = seedData()
  console.log(`seeded ${db.trx.length} transactions`)
}
let dirty = true
const save = () => {
  if (!dirty) return
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE + '.tmp', JSON.stringify(db))
  fs.renameSync(DATA_FILE + '.tmp', DATA_FILE)
  dirty = false
}
setInterval(save, 30_000)
process.on('SIGTERM', () => { save(); process.exit(0) })

// Live traffic: new rows every few seconds, pending rows settle after a minute, old rows age out.
setInterval(() => {
  const now = Date.now()
  const busy = new Date(now).getHours() >= 9 && new Date(now).getHours() <= 22
  const n = Math.floor(rand() * (busy ? 3 : 1.4))
  for (let i = 0; i < n; i += 1) {
    const m = pick(db.merchants.filter((x) => x.client_name !== MERCHANT_NAMES[7][0]))
    db.trx.unshift(makeTrx(m, now - i * 300))
  }
  for (const t of db.trx) {
    if (now - Date.parse(t.created_at) > 5 * 60e3) break
    if (t.status_code === STATUS.pending && now - Date.parse(t.created_at) > 60e3 && rand() < 0.3) {
      t.status_code = rand() < 0.85 ? STATUS.success : STATUS.failed
      t.updated_at = iso(now)
    }
  }
  const cutoff = now - (DAYS + 1) * 864e5
  while (db.trx.length && Date.parse(db.trx[db.trx.length - 1].created_at) < cutoff) db.trx.pop()
  dirty = true
}, 3000)

// ---------- queries ----------
const csv = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : [])
function filterTrx(q, scopeAppIds) {
  const from = parseTime(q.start_date, 0)
  const to = parseTime(q.end_date, Infinity)
  const apps = csv(q.app_id || q.selected_app_id)
  const pms = csv(q.payment_method)
  const statuses = csv(q.status).map(Number)
  const eq = (field, v) => (t) => !v || String(t[field]).includes(String(v))
  const checks = [
    eq('user_mdn', q.user_mdn), eq('user_id', q.user_id), eq('merchant_transaction_id', q.merchant_transaction_id),
    eq('u_id', q.transaction_id), eq('item_name', q.item_name), eq('otp', q.otp), eq('app_name', q.app_name),
  ]
  return db.trx.filter((t) => {
    const ts = Date.parse(t.created_at)
    if (ts < from || ts > to) return false
    if (scopeAppIds && !scopeAppIds.includes(t.appid)) return false
    if (apps.length && !apps.includes(t.appid) && !apps.includes(t.merchant_name)) return false
    if (pms.length && !pms.includes(t.payment_method)) return false
    if (statuses.length && !statuses.includes(t.status_code)) return false
    if (q.denom && Number(q.denom) !== t.amount) return false
    return checks.every((c) => c(t))
  })
}
const page = (rows, q) => {
  const limit = Math.max(1, Number(q.limit) || 10)
  const p = Math.max(1, Number(q.page) || 1)
  return {
    data: rows.slice((p - 1) * limit, p * limit),
    pagination: { total_items: rows.length, total_pages: Math.ceil(rows.length / limit), current_page: p, limit },
  }
}

function traffic(q, bucketMs) {
  const from = parseTime(q.start, Date.now() - 864e5)
  const to = parseTime(q.end, Date.now())
  const series = new Map()
  for (const t of db.trx) {
    const ts = Date.parse(t.created_at)
    if (ts < from) break
    if (ts > to) continue
    const m = db.merchants.find((x) => x.client_name === t.merchant_name)
    const key = t.merchant_name + '|' + t.payment_method
    if (!series.has(key)) series.set(key, { merchant_name: t.merchant_name, client_uid: m?.u_id, payment_method: t.payment_method, points: new Map() })
    const start = Math.floor(ts / bucketMs) * bucketMs
    const pts = series.get(key).points
    if (!pts.has(start)) pts.set(start, { timestamp: iso(start), success: 0, pending: 0, waiting: 0, failed: 0, total: 0 })
    const pt = pts.get(start)
    const name = t.status_code === STATUS.waiting ? 'waiting' : STATUS_NAME[t.status_code]
    pt[name] += 1
    pt.total += 1
  }
  return {
    data: [...series.values()].map((s) => ({
      merchant_name: s.merchant_name,
      client_uid: s.client_uid,
      payment_method: s.payment_method,
      data: [...s.points.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    })),
  }
}

function summary(q, scopeAppIds) {
  const from = parseTime(q.start_date, 0)
  const to = parseTime(q.end_date, Infinity) + (/^\d{4}-\d{2}-\d{2}$/.test(q.end_date || '') ? 864e5 - 1 : 0)
  const groups = new Map()
  for (const t of db.trx) {
    const ts = Date.parse(t.created_at)
    if (ts < from || ts > to) continue
    if (scopeAppIds && !scopeAppIds.includes(t.appid)) continue
    if (q.merchant && t.merchant_name !== q.merchant) continue
    if (q.payment_method && !csv(q.payment_method).includes(t.payment_method)) continue
    if (q.route && t.route !== q.route) continue
    const status = STATUS_NAME[t.status_code]
    if (q.status && q.status !== status) continue
    const date = new Date(ts + 7 * 3600e3).toISOString().slice(0, 10) // Jakarta day
    const key = [date, t.merchant_name, status, t.payment_method, t.route].join('|')
    if (!groups.has(key)) groups.set(key, { date, merchant_name: t.merchant_name, status, payment_method: t.payment_method, route: t.route, amount: 0, price: 0, total: 0, revenue: 0 })
    const g = groups.get(key)
    g.total += 1
    g.amount += t.amount
    g.price += t.price
    if (status === 'success') g.revenue += Math.round(t.amount * 0.3)
  }
  return { data: [...groups.values()].sort((a, b) => b.date.localeCompare(a.date)) }
}

function reportMerchant(q) {
  const m = db.merchants.find((x) => x.u_id === q.client_uid)
  const rows = filterTrx({ start_date: q.start_date, end_date: q.end_date, payment_method: q.payment_method, app_id: q.app_id, status: '1000' })
    .filter((t) => !m || t.merchant_name === m.client_name)
  const by = new Map()
  for (const t of rows) {
    const key = t.merchant_name + '|' + t.payment_method
    if (!by.has(key)) by.set(key, { merchant_name: t.merchant_name, payment_method: t.payment_method, amount: 0, amount_tax: 0, count: 0, total_amount: 0, share_redision: 0, share_merchant: 0 })
    const s = by.get(key)
    s.count += 1
    s.amount += t.amount
  }
  const summaries = [...by.values()].map((s) => {
    s.amount_tax = Math.round(s.amount / 1.11)
    s.total_amount = s.amount
    s.share_redision = Math.round(s.amount_tax * 0.3)
    s.share_merchant = s.amount_tax - s.share_redision
    return s
  })
  const sum = (f) => summaries.reduce((a, s) => a + s[f], 0)
  const total = sum('amount')
  return {
    summaries,
    additional_fee: 0,
    bhp_uso: Math.round(total * 0.0175),
    tax_23: Math.round(sum('share_redision') * 0.02),
    service_charge: 0,
    grand_total_redision: sum('share_redision'),
    total_merchant: sum('share_merchant'),
    grand_total: total,
    total_transaction: sum('count'),
    total_transaction_amount: total,
    share_redision: sum('share_redision'),
    share_merchant: sum('share_merchant'),
    mdr: '3.5%',
  }
}

function reportMargin(q) {
  const rows = filterTrx({ start_date: q.start_date, end_date: q.end_date, status: '1000' })
  const by = new Map()
  for (const t of rows) {
    const m = db.merchants.find((x) => x.client_name === t.merchant_name)
    const key = t.merchant_name + '|' + t.payment_method + '|' + t.route
    if (!by.has(key)) by.set(key, { merchant_name: t.merchant_name, payment_method: t.payment_method, client_uid: m?.u_id, route: t.route, fee: 0, count: 0, total_amount: 0 })
    const s = by.get(key)
    s.count += 1
    s.total_amount += t.amount
  }
  const summaries = [...by.values()].map((s) => {
    const tax = Math.round(s.total_amount / 1.11)
    const supplier = Math.round(tax * 0.6)
    const merchant = Math.round(tax * 0.28)
    const redision = tax - supplier - merchant
    return {
      ...s, fee: Math.round(s.total_amount * 0.035), total_amount_tax: tax, share_redision: redision, share_merchant: merchant, margin: redision,
      share_supplier: supplier, share_supplier_inc: Math.round(supplier * 1.11), bhp_uso_supplier: Math.round(supplier * 0.0175),
      pph_supplier: Math.round(supplier * 0.02), share_supplier_nett: Math.round(supplier * 0.9625), share_merchant_percentage: 28, share_redision_percentage: 12,
    }
  })
  return {
    calculation_formula: 'amount / 1.11 = amount before tax',
    share_redision_formula: 'amount before tax - supplier - merchant',
    total_amount: summaries.reduce((a, s) => a + s.total_amount, 0),
    total_margin: summaries.reduce((a, s) => a + s.margin, 0),
    summaries,
  }
}

function duration(q) {
  const from = parseTime(q.start_date, Date.now() - 864e5)
  const to = parseTime(q.end_date, Date.now()) + 864e5
  const by = new Map()
  for (const t of db.trx) {
    const ts = Date.parse(t.created_at)
    if (ts < from) break
    if (ts > to) continue
    const hour = Math.floor(ts / 3600e3) * 3600e3
    const key = hour + '|' + t.merchant_name + '|' + t.payment_method + '|' + STATUS_NAME[t.status_code]
    if (!by.has(key)) by.set(key, { date: iso(hour), merchant_name: t.merchant_name, payment_method: t.payment_method, status: STATUS_NAME[t.status_code], n: 0 })
    by.get(key).n += 1
  }
  const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)} menit ${s % 60} detik` : `${s} detik`)
  return {
    data: [...by.values()].map((g) => {
      const sup = 2 + Math.floor(rand() * 20)
      const mer = 1 + Math.floor(rand() * 6)
      return { date: g.date, merchant_name: g.merchant_name, payment_method: g.payment_method, status: g.status, avg_supplier_duration: fmt(sup), avg_merchant_duration: fmt(mer), avg_total_duration: fmt(sup + mer), total_transactions: g.n }
    }),
  }
}

const toCsv = (rows) => {
  if (!rows.length) return 'no data\n'
  const cols = Object.keys(rows[0])
  return [cols.join(','), ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n')
}

// ---------- auth ----------
// Any password works. Usernames containing "merchant" log in as the first merchant; everyone else is admin.
function login(body) {
  const username = String(body.username || '').trim()
  if (!username) return [400, { message: 'Username wajib diisi' }]
  const merchant = /merchant/i.test(username)
  const app = db.merchants[0].apps[0]
  const claims = {
    username,
    role: merchant ? 'merchant' : 'admin',
    exp: Math.floor(Date.now() / 1000) + 7 * 86400,
    ...(merchant ? { appid: app.appid, appkey: app.appkey, devappid: app.appid, devappkey: app.appkey } : {}),
  }
  return [200, { token: `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(claims)}.dito` }]
}
const scope = (req) => {
  const appid = req.headers.appid
  if (!appid) return null
  const m = db.merchants.find((x) => x.apps.some((a) => a.appid === appid))
  return m ? m.apps.map((a) => a.appid) : [appid]
}

// ---------- routes ----------
const routes = []
const on = (method, pattern, fn) => routes.push({ method, re: new RegExp('^/api' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '/?$'), fn })

on('POST', '/user/login', (ctx) => login(ctx.body))

on('GET', '/admin/merchants', () => [200, { data: db.merchants }])
on('GET', '/admin/merchant/:id', ({ p }) => {
  const m = db.merchants.find((x) => x.u_id === p.id)
  return m ? [200, { success: true, data: m }] : [404, { success: false, message: 'Merchant tidak ditemukan' }]
})
on('GET', '/admin/payment-methods', () => [200, {
  success: true,
  data: PM.map((p, i) => ({ id: i + 1, slug: p.slug, description: p.slug.replace(/_/g, ' '), type: p.slug.includes('airtime') ? 'dcb' : 'ewallet', status: '1', flexible: true, min_denom: 5000, denom: DENOMS.map(String), prefix: null, route: [p.route] })),
}])
const applyMerchantBody = (m, b) => {
  for (const k of ['client_name', 'app_name', 'mobile', 'client_status', 'testing', 'address', 'phone', 'email', 'lang', 'callback_url', 'isdcb', 'whitelisted_ips']) if (b[k] !== undefined) m[k] = b[k]
  const now = iso(Date.now())
  const id = db.merchants.indexOf(m) + 1
  if (Array.isArray(b.selected_payment_methods)) {
    m.payment_methods = b.selected_payment_methods.map((s, j) => ({ id: id * 100 + j, name: s.payment_method_slug, route: (s.selected_routes || []).map((r) => r.route), flexible: true, status: Number(s.status ?? 1), msisdn: Number(s.msisdn || 0), client_id: id }))
    m.settlements = b.selected_payment_methods.map((s, j) => ({ id: id * 100 + j, client_id: id, name: s.payment_method_slug, ...(s.settlement_config || {}), updated_at: now, created_at: now }))
    m.route_weights = b.selected_payment_methods.flatMap((s) => (s.selected_routes || []).map((r, j) => ({ id: id * 1000 + j, client_id: id, payment_method: s.payment_method_slug, route: r.route, weight: Number(r.weight) || 0, created_at: now, updated_at: now })))
  }
  if (Array.isArray(b.client_app)) {
    m.apps = b.client_app.map((a, j) => {
      const old = m.apps.find((x) => x.id === a.id)
      return { ...(old || { id: id * 10 + j, appid: hex(8), appkey: hex(16), client_id: id, created_at: now }), ...a, updated_at: now }
    })
  }
  m.updated_at = now
}
on('POST', '/admin/merchant/v2', ({ body }) => {
  const m = makeMerchant([body.client_name || 'Merchant baru', body.app_name || 'App baru', 1], db.merchants.length)
  db.merchants.push(m)
  applyMerchantBody(m, body)
  return [200, { success: true, data: m }]
})
on('PUT', '/admin/merchant/v2/:id', ({ p, body }) => {
  const m = db.merchants.find((x) => x.u_id === p.id)
  if (!m) return [404, { success: false, message: 'Merchant tidak ditemukan' }]
  applyMerchantBody(m, body)
  return [200, { success: true, data: m }]
})

on('GET', '/merchant/detail', ({ q, req }) => {
  const appid = q.app_id || req.headers.appid
  const m = db.merchants.find((x) => x.apps.some((a) => a.appid === appid)) || db.merchants[0]
  return [200, { success: true, data: { ...m, payment_methods: m.payment_methods.map((pm) => ({ ...pm, route: Object.fromEntries((pm.route || []).map((r) => [r, []])) })) } }]
})
on('PUT', '/merchant/profile', ({ body, req }) => {
  const m = db.merchants.find((x) => x.apps.some((a) => a.appid === req.headers.appid)) || db.merchants[0]
  if (body.email !== undefined) m.email = body.email
  if (body.address !== undefined) m.address = body.address
  for (const a of body.client_apps || []) Object.assign(m.apps.find((x) => x.id === a.id) || {}, a)
  return [200, { success: true, message: 'Profil diperbarui' }]
})

on('GET', '/transactions', ({ q }) => [200, page(filterTrx(q), q)])
on('GET', '/merchant/transactions', ({ q, req }) => [200, page(filterTrx(q, scope(req)), q)])
const findTrx = (id) => db.trx.find((t) => t.u_id === id || t.merchant_transaction_id === id)
on('GET', '/transaction/:id', ({ p }) => (findTrx(p.id) ? [200, { data: findTrx(p.id) }] : [404, { message: 'Transaksi tidak ditemukan' }]))
on('GET', '/merchant/transaction/:id', ({ p }) => (findTrx(p.id) ? [200, { data: findTrx(p.id) }] : [404, { message: 'Transaksi tidak ditemukan' }]))
on('GET', '/transactions/:id/notification-history', ({ p }) => {
  const t = findTrx(p.id)
  if (!t) return [200, { data: [] }]
  return [200, { data: [{ timestamp: t.updated_at, level: 'info', endpoint: db.merchants.find((m) => m.client_name === t.merchant_name)?.callback_url || '', method: 'POST', status_code: 200, duration_ms: 182, request_body: { transaction_id: t.u_id, status_code: t.status_code }, response_body: { message: 'ok' } }] }]
})
const setStatus = (id, code) => {
  const t = findTrx(id)
  if (!t) return [404, { message: 'Transaksi tidak ditemukan' }]
  t.status_code = code
  t.updated_at = iso(Date.now())
  if (code === STATUS.success) t.timestamp_callback_result = 'ok'
  dirty = true
  return [200, { status: 200, success: true, message: 'Transaction updated' }]
}
on('GET', '/mark-paid/:id', ({ p }) => setStatus(p.id, STATUS.waiting))
on('GET', '/mark-failed/:id', ({ p }) => setStatus(p.id, STATUS.failed))
on('POST', '/manual-callback/:id', ({ p }) => setStatus(p.id, STATUS.success))
on('POST', '/transactions/paid-to-success/:id', ({ p }) => setStatus(p.id, STATUS.success))
on('POST', '/merchant/resend-callback/:id', () => [200, { success: true, message: 'Callback dikirim ulang' }])
on('GET', '/check/:id', () => [200, { data: { transactionInquiryStatusTO: { responseCode: '00', responseDesc: 'Success (mock)' } } }])
on('GET', '/check-status/dana/:id', () => [200, { data: { response: { body: { statusDetail: { acquirementStatus: 'SUCCESS' } } } } }])
on('GET', '/check-status/ovo/:id', () => [200, { data: { responseCode: '00' } }])
on('GET', '/check-status/qris-harsya/:id', () => [200, { data: { data: { status: 'PAID' } } }])

on('GET', '/traffic/monitoring', ({ q }) => [200, traffic(q, 10 * 60e3)])
on('GET', '/traffic/monitoring/hourly', ({ q }) => [200, traffic(q, 3600e3)])
on('GET', '/traffic/monitoring/duration', ({ q }) => [200, duration(q)])
on('GET', '/summary/transaction', ({ q, req }) => [200, summary(q, scope(req)), q.format])
on('GET', '/report/merchant', ({ q }) => [200, reportMerchant(q)])
on('GET', '/report/merchant/margin', ({ q }) => [200, reportMargin(q)])
on('GET', '/export', ({ q }) => [200, filterTrx(q).slice(0, 5000), 'csv'])
on('GET', '/export/transactions-merchant', ({ q, req }) => [200, filterTrx(q, scope(req)).slice(0, 5000), 'csv'])

// ---------- server ----------
const send = (res, code, body, as) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (as && as !== 'json') {
    const rows = Array.isArray(body) ? body : body.data || []
    res.writeHead(code, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="export.csv"' })
    return res.end(toCsv(rows))
  }
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Origin,Content-Type,Accept,Authorization,appid,appkey',
    })
    return res.end()
  }
  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/health') return send(res, 200, { ok: true, transactions: db.trx.length, merchants: db.merchants.length })
  const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname))
  if (!route) return send(res, 404, { message: `dito-api: ${req.method} ${url.pathname} belum ada` })
  const needsAuth = !url.pathname.endsWith('/user/login') && !url.pathname.startsWith('/api/check/')
  if (needsAuth && !/^Bearer .+/.test(req.headers.authorization || '')) return send(res, 401, { message: 'Unauthorized' })
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    let body = {}
    try { body = raw ? JSON.parse(raw) : {} } catch { return send(res, 400, { message: 'Body bukan JSON' }) }
    try {
      const q = Object.fromEntries(url.searchParams)
      const [code, out, as] = route.fn({ req, q, body, p: url.pathname.match(route.re).groups || {} })
      if (req.method !== 'GET') dirty = true
      send(res, code, out, as)
    } catch (e) {
      console.error(e)
      send(res, 500, { message: 'dito-api error: ' + e.message })
    }
  })
}).listen(PORT, () => console.log(`dito-api on :${PORT}`))
