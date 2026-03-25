// GET /dashboard — protected dashboard page
// Checks cookie, fetches Google Sheets data, returns full HTML

const https = require('https');

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').map(c => {
    const [k, ...v] = c.trim().split('=');
    return [k, v.join('=')];
  }));
}

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    grant_type:    'refresh_token',
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).access_token); } catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function fetchSheet(token, sheetId, range) {
  const path = `/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'sheets.googleapis.com',
      path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({}); }
      });
    });
    req.on('error', () => resolve({}));
    req.end();
  });
}

module.exports = async (req, res) => {
  // Auth check
  const cookies = parseCookies(req);
  if (cookies.sjc_session !== process.env.DASHBOARD_PASSWORD) {
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  const stateToken = process.env.DASHBOARD_PASSWORD;
  const now = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  }).replace(',', ' ·');

  // Fetch Google Sheets data
  let monthlyRetainer = '$3,000';
  let ltv = '$7,500';
  try {
    const token = await getAccessToken();
    if (token) {
      const sheetId = process.env.SJC_SHEET_ID;
      const [clientsData, ltvData] = await Promise.all([
        fetchSheet(token, sheetId, 'Clients!B2:B100'),
        fetchSheet(token, sheetId, 'Monthly History!D2:D100'),
      ]);
      const clientVals = clientsData.values || [];
      const total = clientVals.reduce((sum, row) => {
        const n = parseInt(row[0]);
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
      if (total > 0) monthlyRetainer = `$${total.toLocaleString()}`;

      const ltvVals = ltvData.values || [];
      if (ltvVals.length > 0) {
        const last = parseInt(ltvVals[ltvVals.length - 1][0]);
        if (!isNaN(last)) ltv = `$${last.toLocaleString()}`;
      }
    }
  } catch (e) { /* use defaults */ }

  const html = buildDashboard({ now, monthlyRetainer, ltv, stateToken });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};

function buildDashboard({ now, monthlyRetainer, ltv, stateToken }) {
  const TECH_STACK = [
    ["GitHub Backup",       true,  "all-claude-skills repo live"],
    ["Modal",               true,  "Dashboards + Telegram bot deployed"],
    ["Memory System",       true,  "Loads every session"],
    ["CLAUDE.md",           true,  "Workspace map current"],
    ["Render Server",       true,  "sjc-server.onrender.com — middleware live"],
    ["Telegram Bot — FB",   false, "FB ads data not yet plugged in"],
    ["Telegram Bot — GHL",  false, "GHL notifications not yet plugged in"],
    ["Daily Briefing",      false, "Morning summary not yet built"],
    ["Skills Audit",        false, "26 skills — untested"],
    ["SOPs",                false, "Not yet documented"],
    ["My GHL Pipeline",     false, "Back burner — no clients yet"],
    ["Claude Skills Build-Out", false, "Keep expanding terminal skills library"],
    ["Agent Swarm",         false, "Build multi-agent system in Claude Code"],
    ["Obsidian",            false, "Knowledge base — integrate with Claude Code workflow"],
    ["Windsor AI",          false, "GHL data → dashboards via Windsor AI connector"],
  ];

  const ALAMO_SLIM = [
    ["Modern Website",              true,  "Live"],
    ["Quiz Funnel",                 true,  "10-page Perspective Funnels — live"],
    ["Facebook Ads Live",           true,  "3 video ads running — vid-wl-tx-mar26-ad-01/02/03"],
    ["FB Ads Dashboard",            true,  "Live on Vercel — alamo-slim-dashboard.vercel.app"],
    ["Product Sales Dashboard",     true,  "Live on Modal — stevenjames411--alamo-slim-product-dashboard-serve.modal.run"],
    ["Google Calendar Sync",        true,  "Synced to AestheticsPro"],
    ["GHL Pipeline Rebuild",        false, "NEXT — Rebuild Main Pipeline before scaling ad spend"],
    ["CSM Hire #1",                 false, "Hire first CSM after GHL pipeline is clean"],
    ["Wellifiy Integration",        false, "Patient retention app — target: reduce 29.3% single-visit churn to 15%"],
    ["Scale Ad Spend",              false, "BLOCKED on GHL + CSM infrastructure. Target: $25K/mo → 12 CSMs → $11.7M/year"],
    ["GHL Optimized",               false, "Pipeline + CSM workflow — not yet rebuilt"],
    ["AestheticsPro Webhook",       false, "Email sent — waiting on response"],
    ["CSM Workflow Documented",     false, "Not yet written up"],
    ["Qualiphy Integration",        false, "Not started"],
    ["Backup Campaigns",            false, "Not built yet"],
    ["Case Study",                  false, "30-day new ad data needed — new ads launched Mar 19, 2026"],
    ["Dosage Explainer Video",      false, "Get compound mg/mL data from clinic → build visual dosing vs competitor video"],
    ["Trust Explainer Video",       false, "Real patient story format — why they failed before, why Alamo Slim is different"],
    ["10-Page Educational Funnel",  false, "Survey-style landing page: educates on dosage problem → pre-sells CSM intake"],
    ["Dosage + Trust Ad Creative",  false, "Run dosage angle as Facebook ad — combine with Pam real-people format"],
    ["Next TX City Test",           false, "Dallas or Houston — after infrastructure is solid"],
    ["Peptides Funnel",             false, "Not started"],
  ];

  const LADY_LUCK = [
    ["Modern Website",              true,  "Live"],
    ["Promotions Landing Page",     true,  "Built for FB ad traffic"],
    ["FB Account Access",           true,  "Access confirmed"],
    ["FB Pixel on Promo Page",      true,  "Pixel installed on promo page"],
    ["First Ad Campaign",           true,  "Ad running on Facebook"],
    ["FB Ads Dashboard",            true,  "Live on Vercel — alamo-slim-dashboard.vercel.app"],
  ];

  const NEXT_CLIENT = [
    ["Finish Dialing In Alamo Slim",    false, "Facebook ads KPIs locked, full system proven end-to-end"],
    ["Package Case Study",              false, "CAC, bookings, revenue lift — proof of concept for new prospects"],
    ["SJC Quiz Funnel",                 false, "Build Perspective Funnels quiz for SJC — same system as Alamo Slim"],
    ["SJC Facebook Ads",                false, "Run FB ads targeting med spa owners — same system, sell the system"],
    ["Pick Target State",               false, "Different from Texas"],
    ["Build Prospect List",             false, "Med spas / GLP-1 clinics — scrape via Apify + Google Maps"],
    ["Sales Deck",                      false, "Lead with Alamo Slim case study numbers"],
    ["Pricing Document",                false, "$15-20K retainer offer — website + quiz funnel + FB ads"],
    ["Client Onboarding Template",      false, "Folder structure + CONTEXT.md"],
  ];

  const SJC_ACADEMY = [
    ["Tweak Website",           false, "Align to Systems Architect Academy positioning — not a website company"],
    ["Tweak Skool Community",   false, "Align bio, about page, and community positioning"],
    ["Build Perspective Funnel",false, "Quiz + VSL page — same structure as med spa funnel"],
    ["Film VSL",                false, "Video sales letter for the quiz funnel page"],
    ["Film Ad Content",         false, "Ad creative for Facebook"],
    ["Piece It All Together",   false, "Connect ads → funnel → booking calendar"],
    ["Launch Facebook Ads",     false, "Go live — 50x scale target"],
  ];

  function pct(items) {
    const done = items.filter(i => i[1]).length;
    return Math.round(done / items.length * 100);
  }
  function prog(items) {
    return { done: items.filter(i => i[1]).length, total: items.length };
  }
  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function cardsHtml(items, sectionId) {
    let out = `<div class="task-cards" id="cards-${sectionId}">`;
    for (const [label, , note] of items) {
      const tid = `${sectionId}-${slugify(label)}`;
      out += `<div class="task-card" data-id="${tid}">
  <div class="drag-handle">⠿</div>
  <div class="tc-check" data-id="${tid}" onclick="toggleTask(this)"><div class="tc-ring"></div></div>
  <div class="tc-body">
    <div class="tc-title" contenteditable="true">${label}</div>
    <div class="tc-note" contenteditable="true">${note}</div>
  </div>
  <button class="delete-task-btn" onclick="deleteBuiltinTask(this)">×</button>
</div>`;
    }
    out += `</div><button class="add-task-btn" onclick="addCustomTask('cards-${sectionId}')">+ Add Task</button>`;
    return out;
  }
  function progressBar(items, color) {
    const { done, total } = prog(items);
    const p = pct(items);
    return `<div class="progress-wrap">
  <div class="progress-bar"><div class="progress-fill" style="width:${p}%;background:${color}"></div></div>
  <span class="progress-label">${done}/${total} complete</span>
</div>`;
  }

  const ts = prog(TECH_STACK), as = prog(ALAMO_SLIM), ll = prog(LADY_LUCK), nc = prog(NEXT_CLIENT), sja = prog(SJC_ACADEMY);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>SJC Command Dashboard</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0a0a0a;
    color: #e5e7eb;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
  }
  @media (min-width: 768px) {
    body { font-size: 16px; padding: 40px; }
    .header h1 { font-size: 28px; }
    .header .sub { font-size: 13px; }
    .section-title { font-size: 14px; }
    .check-row { padding: 11px 18px; }
    .label { font-size: 15px; }
    .note { font-size: 12px; }
    .light-row { padding: 11px 18px; }
    .light-label { font-size: 15px; }
    .light-note { font-size: 12px; }
    .progress-label { font-size: 12px; }
  }
  .header {
    text-align: center;
    padding: 20px 0 16px;
    border-bottom: 1px solid #1f2937;
    margin-bottom: 20px;
  }
  .header h1 { font-size: 20px; font-weight: 700; color: #f9fafb; letter-spacing: -0.3px; }
  .header .sub { font-size: 11px; color: #ffffff; margin-top: 4px; }
  .logout-btn {
    position: absolute;
    top: 20px;
    right: 24px;
    background: none;
    border: 1px solid #1f2937;
    color: #6b7280;
    font-size: 11px;
    padding: 5px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .logout-btn:hover { color: #9ca3af; border-color: #374151; }
  .snapshot { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
  .snap-card { background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 14px; text-align: center; }
  .snap-card .val { font-size: 24px; font-weight: 700; color: #f9fafb; }
  .snap-card .lbl { font-size: 11px; color: #ffffff; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
  .section { margin-bottom: 24px; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; cursor: pointer; user-select: none; }
  .section-title { font-size: 13px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px; }
  .section-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
  .badge-blue   { background: #1e3a5f; color: #60a5fa; }
  .badge-green  { background: #14532d; color: #4ade80; }
  .badge-yellow { background: #451a03; color: #fbbf24; }
  .badge-purple { background: #2e1065; color: #a78bfa; }
  .progress-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .progress-bar { flex: 1; height: 6px; background: #1f2937; border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
  .progress-label { font-size: 11px; color: #ffffff; white-space: nowrap; }
  .card { background: #111827; border: 1px solid #1f2937; border-radius: 10px; overflow: hidden; }
  .card-body { padding: 4px 0; }
  .check-row { display: flex; align-items: flex-start; gap: 10px; padding: 9px 14px; border-bottom: 1px solid #1a2332; transition: background 0.1s; flex-wrap: wrap; }
  .check-row:last-child { border-bottom: none; }
  .check-row.done { opacity: 0.55; }
  .icon { font-size: 14px; font-weight: 700; min-width: 16px; margin-top: 1px; }
  .label { flex: 1; color: #e5e7eb; font-size: 13px; line-height: 1.4; width: calc(100% - 26px); }
  .note { font-size: 11px; color: #e5e7eb; display: block; margin-top: 2px; width: 100%; }
  .light-row { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-bottom: 1px solid #1a2332; }
  .light-row:last-child { border-bottom: none; }
  .dot { width: 8px; height: 8px; border-radius: 50%; min-width: 8px; }
  .dot-green { background: #4ade80; box-shadow: 0 0 6px #4ade80; }
  .dot-red   { background: #f87171; box-shadow: 0 0 6px #f87171; }
  .light-label { flex: 1; font-size: 13px; color: #e5e7eb; }
  .light-note  { font-size: 11px; color: #e5e7eb; }
  .client-cards { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
  .client-card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .client-left { flex: 1; }
  .client-name { font-size: 15px; font-weight: 700; color: #f9fafb; }
  .client-type { font-size: 11px; color: #ffffff; margin-top: 3px; }
  .client-right { display: flex; align-items: center; gap: 16px; }
  .client-metric { text-align: right; }
  .client-val { font-size: 20px; font-weight: 700; }
  .client-lbl { font-size: 10px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; }
  .client-probono { font-size: 10px; color: #f59e0b; margin-top: 2px; }
  .client-divider { width: 1px; height: 36px; background: #1f2937; }
  @media (min-width: 768px) {
    .client-cards { flex-direction: row; }
    .client-card { flex: 1; }
    .client-name { font-size: 17px; }
    .client-val { font-size: 24px; }
  }
  .feature-card { border: 1px solid #1f2937; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 14px; }
  .feature-pct { font-size: 48px; font-weight: 800; line-height: 1; letter-spacing: -2px; }
  .feature-title { font-size: 16px; font-weight: 600; color: #f9fafb; margin-top: 6px; }
  .feature-sub { font-size: 12px; color: #ffffff !important; margin-top: 4px; }
  @media (min-width: 768px) {
    .feature-pct { font-size: 64px; }
    .feature-title { font-size: 20px; }
    .feature-sub { font-size: 13px; }
  }
  .updated { text-align: center; font-size: 11px; color: #374151; margin-top: 24px; padding-bottom: 32px; }
  .add-task-btn { display: block; width: 100%; margin-top: 8px; padding: 9px 14px; background: none; border: 1px dashed #1f2937; border-radius: 8px; color: #4b5563; font-size: 12px; font-weight: 500; cursor: pointer; text-align: left; transition: border-color 0.15s, color 0.15s; }
  .add-task-btn:hover { border-color: #374151; color: #9ca3af; }
  .delete-task-btn { background: none; border: none; color: #374151; font-size: 16px; cursor: pointer; padding: 0 4px; line-height: 1; flex-shrink: 0; transition: color 0.15s; }
  .delete-task-btn:hover { color: #f87171; }
  .tc-title[contenteditable], .tc-note[contenteditable] { outline: none; cursor: text; }
  .tc-title[contenteditable]:empty:before { content: 'Type task here...'; color: #4b5563; }
  .tc-note[contenteditable]:empty:before { content: 'Add a note...'; color: #374151; }
  .tc-title[contenteditable]:focus, .tc-note[contenteditable]:focus { background: #1f2937; border-radius: 4px; padding: 2px 4px; margin: -2px -4px; }
  .tab-nav { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid #1f2937; }
  .tab-btn { background: none; border: none; color: #6b7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; font-weight: 600; padding: 10px 18px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; letter-spacing: 0.3px; transition: color 0.15s; }
  .tab-btn:hover { color: #d1d5db; }
  .tab-btn.active { color: #f9fafb; border-bottom-color: #c8ff00; }
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  .offer-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .offer-sum-card { background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 18px; }
  .offer-sum-card.primary { border-color: #4d6e00; }
  .offer-sum-label { font-size: 10px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #ffffff; margin-bottom: 6px; }
  .offer-sum-card.primary .offer-sum-label { color: #8aaa00; }
  .offer-sum-title { font-size: 17px; font-weight: 700; color: #f9fafb; margin-bottom: 4px; }
  .offer-sum-price { font-size: 12px; color: #ffffff; }
  .offer-sum-card.primary .offer-sum-price { color: #c8ff00; }
  .funnel-mini { background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 24px; flex-wrap: wrap; }
  .funnel-mini-step { font-size: 12px; color: #ffffff; font-weight: 500; }
  .funnel-mini-arrow { font-size: 11px; color: #374151; }
  .task-cards { display: flex; flex-direction: column; gap: 8px; padding: 4px 0; }
  .task-card { background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px; cursor: default; transition: border-color 0.15s, opacity 0.2s; }
  .task-card.done { opacity: 1; }
  .drag-handle { color: #374151; font-size: 16px; cursor: grab; padding-top: 2px; flex-shrink: 0; user-select: none; }
  .drag-handle:active { cursor: grabbing; }
  .tc-check { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #374151; flex-shrink: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-top: 2px; transition: border-color 0.15s, background 0.15s; }
  .tc-check:hover { border-color: #6b7280; }
  .task-card.done .tc-check { background: #4ade80; border-color: #4ade80; }
  .tc-ring { width: 8px; height: 8px; border-radius: 50%; background: transparent; transition: background 0.15s; }
  .task-card.done .tc-ring { background: #0a0a0a; }
  .tc-body { flex: 1; min-width: 0; }
  .tc-title { font-size: 14px; color: #e5e7eb; line-height: 1.4; font-weight: 500; }
  .tc-note { font-size: 11px; color: #ffffff; margin-top: 3px; line-height: 1.4; }
  @media (min-width: 768px) {
    .tc-title { font-size: 15px; }
    .tc-note { font-size: 13px; }
  }
</style>
</head>
<body>
<button class="logout-btn" onclick="logout()">Log out</button>

<div class="header">
  <h1>Steven James Consulting</h1>
  <div class="sub">Command Dashboard · ${now}</div>
</div>

<div class="tab-nav">
  <button class="tab-btn active" onclick="switchTab('clients', this)">Clients</button>
  <button class="tab-btn" onclick="switchTab('academy', this)">SJC Academy</button>
</div>

<div id="tab-clients" class="tab-content active">

<div class="client-cards">
  <div class="client-card" data-id="cc-alamo-slim">
    <div class="client-left">
      <div class="client-name" contenteditable="true">Alamo Slim Clinic</div>
      <div class="client-type" contenteditable="true">Med Spa · GLP-1 Telehealth</div>
    </div>
    <div class="client-right">
      <div class="client-metric">
        <div class="client-val" style="color:#4ade80">${monthlyRetainer}</div>
        <div class="client-lbl">Monthly</div>
      </div>
      <div class="client-divider"></div>
      <div class="client-metric">
        <div class="client-val" style="color:#34d399">${ltv}</div>
        <div class="client-lbl">LTV</div>
      </div>
    </div>
  </div>
  <div class="client-card" data-id="cc-lady-luck">
    <div class="client-left">
      <div class="client-name" contenteditable="true">Lady Luck Skill Games</div>
      <div class="client-type" contenteditable="true">Adult Gaming Room</div>
    </div>
    <div class="client-right">
      <div class="client-metric">
        <div class="client-val" style="color:#9ca3af">$0</div>
        <div class="client-lbl">Monthly</div>
        <div class="client-probono">Pro bono</div>
      </div>
      <div class="client-divider"></div>
      <div class="client-metric">
        <div class="client-val" style="color:#9ca3af">$0</div>
        <div class="client-lbl">LTV</div>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <div class="feature-card" data-id="fc-tech-stack" style="border-color:#60a5fa22;background:linear-gradient(135deg,#1e3a5f55,#111827)">
    <div class="feature-pct" style="color:#60a5fa">${pct(TECH_STACK)}%</div>
    <div class="feature-title" contenteditable="true">My Tech Stack</div>
    <div class="feature-sub">${ts.done} of ${ts.total} complete</div>
  </div>
  <div class="section-header">
    <span class="section-title">Tasks</span>
    <span class="section-badge badge-blue">${ts.done}/${ts.total}</span>
  </div>
  ${progressBar(TECH_STACK, "#60a5fa")}
  ${cardsHtml(TECH_STACK, "tech-stack")}
</div>

<div class="section">
  <div class="feature-card" data-id="fc-alamo-slim" style="border-color:#4ade8022;background:linear-gradient(135deg,#14532d55,#111827)">
    <div class="feature-pct" style="color:#4ade80">${pct(ALAMO_SLIM)}%</div>
    <div class="feature-title" contenteditable="true">Alamo Slim Clinic</div>
    <div class="feature-sub">${as.done} of ${as.total} complete</div>
  </div>
  <div class="section-header">
    <span class="section-title">Tasks</span>
    <span class="section-badge badge-green">${as.done}/${as.total}</span>
  </div>
  ${progressBar(ALAMO_SLIM, "#4ade80")}
  ${cardsHtml(ALAMO_SLIM, "alamo-slim")}
</div>

<div class="section">
  <div class="feature-card" data-id="fc-lady-luck" style="border-color:#fbbf2422;background:linear-gradient(135deg,#451a0355,#111827)">
    <div class="feature-pct" style="color:#fbbf24">${pct(LADY_LUCK)}%</div>
    <div class="feature-title" contenteditable="true">Lady Luck Skill Games</div>
    <div class="feature-sub">${ll.done} of ${ll.total} complete</div>
  </div>
  <div class="section-header">
    <span class="section-title">Tasks</span>
    <span class="section-badge badge-yellow">${ll.done}/${ll.total}</span>
  </div>
  ${progressBar(LADY_LUCK, "#fbbf24")}
  ${cardsHtml(LADY_LUCK, "lady-luck")}
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Next Client Prep</span>
    <span class="section-badge badge-purple">${nc.done}/${nc.total}</span>
  </div>
  ${progressBar(NEXT_CLIENT, "#a78bfa")}
  ${cardsHtml(NEXT_CLIENT, "next-client")}
</div>

</div><!-- /tab-clients -->

<div id="tab-academy" class="tab-content">
  <div class="offer-summary">
    <div class="offer-sum-card primary" data-id="oc-high-ticket">
      <div class="offer-sum-label" contenteditable="true">Offer 1 · Front End · Now</div>
      <div class="offer-sum-title" contenteditable="true">High Ticket Program</div>
      <div class="offer-sum-price" contenteditable="true">$3,000 – $10,000 · Claude Code + GHL CRM + Automations + Org Chart</div>
    </div>
    <div class="offer-sum-card" data-id="oc-mastermind">
      <div class="offer-sum-label" contenteditable="true">Offer 2 · Back End · 12–18 Months In</div>
      <div class="offer-sum-title" contenteditable="true">Annual Mastermind</div>
      <div class="offer-sum-price" contenteditable="true">$8,000 – $20,000 / year · Peers · Hot seats · Direct time with Steven</div>
    </div>
  </div>
  <div class="funnel-mini">
    <span class="funnel-mini-step">FB Ad</span>
    <span class="funnel-mini-arrow">→</span>
    <span class="funnel-mini-step">VSL / Quiz</span>
    <span class="funnel-mini-arrow">→</span>
    <span class="funnel-mini-step">Qualifies</span>
    <span class="funnel-mini-arrow">→</span>
    <span class="funnel-mini-step">Book a Call</span>
    <span class="funnel-mini-arrow">→</span>
    <span class="funnel-mini-step">Close</span>
  </div>
  <div class="section">
    <div class="feature-card" data-id="fc-sjc-academy" style="border-color:#c8ff0022;background:linear-gradient(135deg,#1a2a0055,#111827)">
      <div class="feature-pct" style="color:#c8ff00">${pct(SJC_ACADEMY)}%</div>
      <div class="feature-title" contenteditable="true">Launch Readiness</div>
      <div class="feature-sub">${sja.done} of ${sja.total} steps complete</div>
    </div>
    <div class="section-header">
      <span class="section-title">Launch Checklist</span>
      <span class="section-badge badge-purple">${sja.done}/${sja.total}</span>
    </div>
    ${progressBar(SJC_ACADEMY, "#c8ff00")}
    ${cardsHtml(SJC_ACADEMY, "sjc-academy")}
  </div>
</div><!-- /tab-academy -->

<div class="updated">Last updated · ${now}</div>

<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
<script>
const _STATE_BASE = 'https://sjc-server.onrender.com';
const _STATE_TOKEN = '${stateToken}';
const _STATE_URL = _STATE_BASE + '/sjc/dashboard-state?t=' + _STATE_TOKEN;
let _syncTimer = null;

function logout() {
  document.cookie = 'sjc_session=; Max-Age=0; Path=/';
  window.location.href = '/';
}

function collectState() {
  const s = { checked: {}, text: {}, notes: {}, custom: {}, order: {}, fcards: {}, ccards: {} };
  document.querySelectorAll('.feature-card[data-id] .feature-title').forEach(function(el) {
    const id = el.closest('.feature-card').dataset.id;
    s.fcards[id] = el.textContent.trim();
  });
  document.querySelectorAll('.client-card[data-id], .offer-sum-card[data-id]').forEach(function(card) {
    const id = card.dataset.id;
    card.querySelectorAll('[contenteditable]').forEach(function(el) {
      const cls = el.className.split(' ')[0];
      s.ccards[id + '-' + cls] = el.textContent.trim();
    });
  });
  document.querySelectorAll('.task-card').forEach(function(card) {
    const id = card.dataset.id;
    if (card.classList.contains('done')) s.checked[id] = true;
    const t = localStorage.getItem('text-' + id);
    if (t !== null) s.text[id] = t;
    const n = localStorage.getItem('note-' + id);
    if (n !== null) s.notes[id] = n;
  });
  document.querySelectorAll('.task-cards').forEach(function(c) {
    const custom = getCustomCards(c.id);
    if (custom.length) s.custom[c.id] = custom;
    const ord = localStorage.getItem('order-' + c.id);
    if (ord) s.order[c.id] = JSON.parse(ord);
  });
  return s;
}

function applyState(s) {
  if (!s) return;
  if (s.checked) Object.entries(s.checked).forEach(function(e) { localStorage.setItem('task-' + e[0], e[1] ? '1' : '0'); });
  if (s.text)    Object.entries(s.text).forEach(function(e)    { localStorage.setItem('text-' + e[0], e[1]); });
  if (s.notes)   Object.entries(s.notes).forEach(function(e)   { localStorage.setItem('note-' + e[0], e[1]); });
  if (s.custom)  Object.entries(s.custom).forEach(function(e)  { localStorage.setItem('custom-' + e[0], JSON.stringify(e[1])); });
  if (s.order)   Object.entries(s.order).forEach(function(e)   { localStorage.setItem('order-' + e[0], JSON.stringify(e[1])); });
  if (s.fcards)  Object.entries(s.fcards).forEach(function(e)  { localStorage.setItem('fcard-' + e[0], e[1]); });
  if (s.ccards)  Object.entries(s.ccards).forEach(function(e)  { localStorage.setItem('ccard-' + e[0], e[1]); });
}

function scheduleSync() {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(function() {
    fetch(_STATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectState())
    });
  }, 1000);
}

async function loadServerState() {
  try {
    const r = await fetch(_STATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get' })
    });
    if (r.ok) applyState(await r.json());
  } catch(e) {}
}

function switchTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
}

function getCustomCards(containerId) {
  return JSON.parse(localStorage.getItem('custom-' + containerId) || '[]');
}
function saveCustomCards(containerId, cards) {
  localStorage.setItem('custom-' + containerId, JSON.stringify(cards));
}
function makeCustomCardEl(containerId, id, text) {
  const div = document.createElement('div');
  div.className = 'task-card';
  div.dataset.id = id;
  div.dataset.custom = '1';
  const handle = document.createElement('div');
  handle.className = 'drag-handle';
  handle.textContent = '\u2823';
  const check = document.createElement('div');
  check.className = 'tc-check';
  check.dataset.id = id;
  check.innerHTML = '<div class="tc-ring"></div>';
  check.addEventListener('click', function() { toggleTask(this); });
  const body = document.createElement('div');
  body.className = 'tc-body';
  const title = document.createElement('div');
  title.className = 'tc-title';
  title.contentEditable = 'true';
  title.textContent = text || '';
  title.addEventListener('blur', function() { saveCustomCardText(this, containerId, id); });
  const note = document.createElement('div');
  note.className = 'tc-note';
  note.contentEditable = 'true';
  const savedNote = localStorage.getItem('note-' + id);
  note.textContent = savedNote || '';
  note.addEventListener('blur', function() { localStorage.setItem('note-' + id, note.textContent.trim()); });
  body.appendChild(title);
  body.appendChild(note);
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-task-btn';
  delBtn.textContent = '\u00d7';
  delBtn.addEventListener('click', function() { deleteCustomTask(this, containerId); });
  div.appendChild(handle);
  div.appendChild(check);
  div.appendChild(body);
  div.appendChild(delBtn);
  return div;
}
function addCustomTask(containerId) {
  const container = document.getElementById(containerId);
  const id = containerId + '-c' + Date.now();
  const cards = getCustomCards(containerId);
  cards.push({id: id, text: ''});
  saveCustomCards(containerId, cards);
  const el = makeCustomCardEl(containerId, id, '');
  container.appendChild(el);
  updateProgress(container.closest('.section'));
  el.querySelector('.tc-title').focus();
  scheduleSync();
}
function deleteBuiltinTask(btn) {
  const card = btn.closest('.task-card');
  const section = card.closest('.section');
  const id = card.dataset.id;
  localStorage.removeItem('task-' + id);
  localStorage.removeItem('text-' + id);
  localStorage.removeItem('note-' + id);
  card.remove();
  updateProgress(section);
  scheduleSync();
}

function deleteCustomTask(btn, containerId) {
  const card = btn.closest('.task-card');
  const id = card.dataset.id;
  const cards = getCustomCards(containerId).filter(c => c.id !== id);
  saveCustomCards(containerId, cards);
  localStorage.removeItem('task-' + id);
  const section = card.closest('.section');
  card.remove();
  updateProgress(section);
  scheduleSync();
}
function saveCustomCardText(el, containerId, id) {
  const cards = getCustomCards(containerId);
  const card = cards.find(c => c.id === id);
  if (card) { card.text = el.textContent.trim(); saveCustomCards(containerId, cards); }
  scheduleSync();
}
function restoreCustomCards() {
  document.querySelectorAll('.task-cards').forEach(function(container) {
    getCustomCards(container.id).forEach(function(c) {
      container.appendChild(makeCustomCardEl(container.id, c.id, c.text));
    });
  });
}

function updateProgress(section) {
  if (!section) return;
  const cards = section.querySelectorAll('.task-card');
  const done = section.querySelectorAll('.task-card.done').length;
  const total = cards.length;
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  const fill = section.querySelector('.progress-fill');
  if (fill) fill.style.width = pct + '%';
  const label = section.querySelector('.progress-label');
  if (label) label.textContent = done + '/' + total + ' complete';
  const badge = section.querySelector('.section-badge');
  if (badge) badge.textContent = done + '/' + total;
  const pctEl = section.querySelector('.feature-pct');
  if (pctEl) pctEl.textContent = pct + '%';
  const sub = section.querySelector('.feature-sub');
  if (sub) sub.textContent = done + ' of ' + total + ' complete';
}

function toggleTask(el) {
  const card = el.closest('.task-card');
  const id = el.dataset.id;
  const isDone = card.classList.toggle('done');
  localStorage.setItem('task-' + id, isDone ? '1' : '0');
  updateProgress(card.closest('.section'));
  scheduleSync();
}

function restoreStates() {
  document.querySelectorAll('.task-card').forEach(card => {
    const id = card.dataset.id;
    if (localStorage.getItem('task-' + id) === '1') {
      card.classList.add('done');
    }
  });
  document.querySelectorAll('.section').forEach(section => updateProgress(section));
}

function restoreOrder(container) {
  const key = 'order-' + container.id;
  const saved = localStorage.getItem(key);
  if (!saved) return;
  const ids = JSON.parse(saved);
  ids.forEach(id => {
    const el = container.querySelector('[data-id="' + id + '"]');
    if (el) container.appendChild(el);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadServerState();
  document.querySelectorAll('.feature-card[data-id]').forEach(function(card) {
    const id = card.dataset.id;
    const titleEl = card.querySelector('.feature-title');
    if (!titleEl) return;
    const saved = localStorage.getItem('fcard-' + id);
    if (saved !== null) titleEl.textContent = saved;
    titleEl.addEventListener('blur', function() {
      localStorage.setItem('fcard-' + id, titleEl.textContent.trim());
      scheduleSync();
    });
  });
  document.querySelectorAll('.client-card[data-id], .offer-sum-card[data-id]').forEach(function(card) {
    const id = card.dataset.id;
    card.querySelectorAll('[contenteditable]').forEach(function(el) {
      const cls = el.className.split(' ')[0];
      const key = 'ccard-' + id + '-' + cls;
      const saved = localStorage.getItem(key);
      if (saved !== null) el.textContent = saved;
      el.addEventListener('blur', function() {
        localStorage.setItem(key, el.textContent.trim());
        scheduleSync();
      });
    });
  });
  restoreCustomCards();
  restoreStates();
  document.querySelectorAll('.task-card:not([data-custom])').forEach(function(card) {
    const id = card.dataset.id;
    const title = card.querySelector('.tc-title');
    const note = card.querySelector('.tc-note');
    if (title) {
      const saved = localStorage.getItem('text-' + id);
      if (saved !== null) title.textContent = saved;
      title.addEventListener('blur', function() {
        localStorage.setItem('text-' + id, title.textContent.trim());
        scheduleSync();
      });
    }
    if (note) {
      const savedNote = localStorage.getItem('note-' + id);
      if (savedNote !== null) note.textContent = savedNote;
      note.addEventListener('blur', function() {
        localStorage.setItem('note-' + id, note.textContent.trim());
        scheduleSync();
      });
    }
  });
  document.querySelectorAll('.task-cards').forEach(container => {
    restoreOrder(container);
    Sortable.create(container, {
      handle: '.drag-handle',
      animation: 150,
      onEnd() {
        const ids = [...container.querySelectorAll('.task-card')].map(c => c.dataset.id);
        localStorage.setItem('order-' + container.id, JSON.stringify(ids));
        scheduleSync();
      }
    });
  });
});
</script>
</body>
</html>`;
}
