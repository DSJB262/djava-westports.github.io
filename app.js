// ============================================================
// Task Tracker — Frontend Logic
// ============================================================

const STAGES = [
  'Reported','Troubleshooting','Require Fix','Development',
  'Testing','Plan for Release','Change Ticket Created',
  'CAB Approval','Implementation','Resolved'
];

const STAGE_PCT = {
  'Reported':20, 'Troubleshooting':25, 'Require Fix':30,
  'Development':45, 'Testing':60, 'Plan for Release':70,
  'Change Ticket Created':75, 'CAB Approval':85,
  'Implementation':95, 'Resolved':100
};

const MS_CONFIGS = {
  stage:    { placeholder: 'All Stages',   options: STAGES },
  type:     { placeholder: 'All Types',    options: ['Support Ticket','Email Request','Verbal Request','Development CR','Testing','Others'] },
  status:   { placeholder: 'All Status',   options: ['Open','In Progress','Pending','Resolved','Closed'] },
  priority: { placeholder: 'All Priority', options: ['Critical','High','Medium','Low'] }
};
const msState = {};

const DEVS  = ['Akmal','Indra','Mahmood','Razin','Jay','Joseph'];
const IMPLS = ['Sharron - warfile','Yusuf - DB','Fikri - DB'];

let chartDev = null, chartStage = null, chartStatus = null;

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxSGGK0OvAmcxa-jPhJrGjlDo29olZ6ooIwCujlfWb6a352dlJ9w8cMUNMJDg_KOQZ6eQ/exec';

let API_URL = localStorage.getItem('tracker_api_url') || DEFAULT_API_URL;
let tickets = [], assignees = [], currentDetailId = null;

// ---- Init ----

document.addEventListener('DOMContentLoaded', () => {
  if (!API_URL) show('config-banner');
  else { loadTickets(); loadAssignees(); }

  initMultiSelects();

  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const val = card.dataset.filter;
      clearMs('status');
      if (val !== 'all') setMs('status', val);
      applyFilters();
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); })
  );
});

// ---- API ----

async function apiGet(params) {
  if (!API_URL) throw new Error('Not connected. Open Settings.');
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res  = await fetch(url.toString(), { redirect: 'follow' });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error('Bad response from server.'); }
}

async function apiPost(data) {
  if (!API_URL) throw new Error('Not connected. Open Settings.');
  const res  = await fetch(API_URL, {
    method: 'POST', headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data), redirect: 'follow'
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error('Bad response from server.'); }
}

// ---- Load ----

async function loadTickets() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('ticket-table').classList.add('hidden');
  document.getElementById('empty-state').classList.add('hidden');
  hideBanner('jira-warning');

  try {
    const data = await apiGet({ action: 'getAllTickets' });
    if (data.error) throw new Error(data.error);
    tickets = data.tickets ? data.tickets : (Array.isArray(data) ? data : []);
    if (data.jiraError) showBanner('jira-warning', '⚠️', 'Jira issue: ' + data.jiraError, '#FEF3C7', '#92400E');
    renderTable(tickets);
    renderStats(tickets);
  } catch (err) {
    document.getElementById('loading').classList.add('hidden');
    const es = document.getElementById('empty-state');
    es.querySelector('h3').textContent = 'Could not load tickets';
    es.querySelector('p').textContent  = err.message;
    es.querySelector('.btn-new').classList.add('hidden');
    es.classList.remove('hidden');
  }
}

// ---- Render Table ----

function renderTable(list) {
  document.getElementById('loading').classList.add('hidden');
  const table = document.getElementById('ticket-table');
  const empty = document.getElementById('empty-state');

  if (!list.length) {
    table.classList.add('hidden');
    empty.querySelector('h3').textContent = 'No tickets found';
    empty.querySelector('p').textContent  = 'Create a new ticket or clear your filters.';
    empty.querySelector('.btn-new').classList.remove('hidden');
    empty.classList.remove('hidden');
    return;
  }

  table.classList.remove('hidden');
  empty.classList.add('hidden');

  document.getElementById('ticket-tbody').innerHTML = list.map(t => {
    const isJira = t.Source === 'Jira';
    const sCls   = 's-' + slug(t.Status   || '');
    const pCls   = 'p-' + slug(t.Priority || '');

    const idCell = isJira
      ? `<a class="jira-id" href="${x(t.URL)}" target="_blank">${x(t.ID)}</a><span class="src-badge src-jira">Jira</span>`
      : `<span class="manual-id">${x(t.ID)}</span><span class="src-badge src-manual">Manual</span>`;

    const stage = t.Stage || '';
    const stageHtml = stage
      ? `<span class="stage-badge">${x(stage)}</span>${t.HasProgress ? '' : ''}`
      : `<span style="color:#9CA3AF;font-size:12px">Not set</span>`;

    const actions = isJira
      ? `<button class="act-btn act-view"     onclick="viewTicket('${x(t.ID)}')">View</button>
         <button class="act-btn act-progress" onclick="openProgressModal('${x(t.ID)}')">${t.HasProgress ? '✏ Progress' : '+ Track'}</button>
         <a      class="act-btn act-jira"     href="${x(t.URL)}" target="_blank">↗ Jira</a>`
      : `<button class="act-btn act-view"     onclick="viewTicket('${x(t.ID)}')">View</button>
         <button class="act-btn act-edit"     onclick="editTicket('${x(t.ID)}')">Edit</button>
         <button class="act-btn act-delete"   onclick="deleteTicket('${x(t.ID)}')">Del</button>`;

    return `<tr>
      <td class="id-cell">${idCell}</td>
      <td>
        <div class="t-title" onclick="viewTicket('${x(t.ID)}')">${x(t.Title)}</div>
        ${t.Requester    ? `<div class="t-sub">by ${x(t.Requester)}</div>` : ''}
        ${t['Jira Ref']  ? `<div class="t-sub">🔗 ${x(t['Jira Ref'])}</div>` : ''}
      </td>
      <td>${stageHtml}</td>
      <td><span class="badge ${pCls}">${x(t.Priority || '—')}</span></td>
      <td><span class="badge ${sCls}">${x(t.Status   || '—')}</span></td>
      <td>${t.Assignee ? x(t.Assignee) : '<span style="color:#9CA3AF">—</span>'}</td>
      <td>${dueFmt(t['Due Date'])}</td>
      <td><div class="act-btns">${actions}</div></td>
    </tr>`;
  }).join('');
}

function renderStats(list) {
  const n = s => list.filter(t => t.Status === s).length;
  document.getElementById('s-total').textContent  = list.length;
  document.getElementById('s-open').textContent   = n('Open');
  document.getElementById('s-ip').textContent     = n('In Progress');
  document.getElementById('s-pend').textContent   = n('Pending');
  document.getElementById('s-res').textContent    = n('Resolved');
  document.getElementById('s-closed').textContent = n('Closed');
}

// ---- Filters ----

function applyFilters() {
  const q  = document.getElementById('search').value.toLowerCase();
  const sr = document.getElementById('filter-source').value;
  const sg = msState.stage    || new Set();
  const ty = msState.type     || new Set();
  const st = msState.status   || new Set();
  const pr = msState.priority || new Set();
  const as = document.getElementById('filter-assignee').value;

  renderTable(tickets.filter(t => {
    if (q  && !['Title','Description','ID','Requester','Notes','Project','Jira Ref','Change Ticket No'].some(k => (t[k]||'').toLowerCase().includes(q))) return false;
    if (sr && t.Source   !== sr) return false;
    if (sg.size && !sg.has(t.Stage    || '')) return false;
    if (ty.size && !ty.has(t.Type     || '')) return false;
    if (st.size && !st.has(t.Status   || '')) return false;
    if (pr.size && !pr.has(t.Priority || '')) return false;
    if (as && t.Assignee !== as) return false;
    return true;
  }));
}

function clearFilters() {
  document.getElementById('search').value = '';
  document.getElementById('filter-source').value = '';
  document.getElementById('filter-assignee').value = '';
  ['stage','type','status','priority'].forEach(k => clearMs(k));
  document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
  renderTable(tickets);
}

// ---- Multi-Select Filters ----

function initMultiSelects() {
  Object.entries(MS_CONFIGS).forEach(([key, cfg]) => {
    msState[key] = new Set();
    const wrap = document.getElementById('ms-' + key);
    if (!wrap) return;
    wrap.innerHTML =
      `<div class="ms-btn" onclick="toggleMs('${key}')">` +
        `<span class="ms-lbl" id="mslbl-${key}">${cfg.placeholder}</span>` +
        `<span class="ms-arrow">▾</span>` +
      `</div>` +
      `<div class="ms-drop hidden" id="msdrop-${key}">` +
        cfg.options.map(o =>
          `<label class="ms-opt"><input type="checkbox" value="${x(o)}" onchange="onMsChange('${key}')">${x(o)}</label>`
        ).join('') +
      `</div>`;
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.ms-wrap'))
      document.querySelectorAll('.ms-drop').forEach(d => d.classList.add('hidden'));
  });
}

function toggleMs(key) {
  const drop = document.getElementById('msdrop-' + key);
  const isHidden = drop.classList.contains('hidden');
  document.querySelectorAll('.ms-drop').forEach(d => d.classList.add('hidden'));
  if (isHidden) drop.classList.remove('hidden');
}

function onMsChange(key) {
  const drop = document.getElementById('msdrop-' + key);
  const checked = [...drop.querySelectorAll('input:checked')].map(i => i.value);
  msState[key] = new Set(checked);
  const lbl = document.getElementById('mslbl-' + key);
  lbl.textContent = checked.length === 0 ? MS_CONFIGS[key].placeholder
    : checked.length === 1 ? checked[0]
    : checked.length + ' selected';
  applyFilters();
}

function setMs(key, val) {
  msState[key] = new Set([val]);
  const drop = document.getElementById('msdrop-' + key);
  if (drop) drop.querySelectorAll('input').forEach(i => { i.checked = i.value === val; });
  const lbl = document.getElementById('mslbl-' + key);
  if (lbl) lbl.textContent = val;
}

function clearMs(key) {
  msState[key] = new Set();
  const drop = document.getElementById('msdrop-' + key);
  if (drop) drop.querySelectorAll('input').forEach(i => { i.checked = false; });
  const lbl = document.getElementById('mslbl-' + key);
  if (lbl) lbl.textContent = MS_CONFIGS[key].placeholder;
}

// ---- Create / Edit (Manual) ----

function openCreateModal() {
  if (!API_URL) { openSettings(); return; }
  document.getElementById('modal-title').textContent = 'New Ticket';
  document.getElementById('ticket-id').value = '';
  document.getElementById('ticket-form').reset();
  document.getElementById('f-status').value   = 'Open';
  document.getElementById('f-stage').value    = 'Reported';
  document.getElementById('f-priority').value = 'Medium';
  fillAssigneeSelect('f-assignee', '');
  openModal('ticket-modal');
}

function editTicket(id) {
  const t = tickets.find(t => t.ID === id);
  if (!t) return;
  if (t.Source !== 'Manual') { alert(t.Source + ' tickets are read-only. Use "Track Progress" instead.'); return; }
  document.getElementById('modal-title').textContent     = 'Edit Ticket';
  document.getElementById('ticket-id').value             = t.ID;
  document.getElementById('f-title').value               = t.Title              || '';
  document.getElementById('f-type').value                = t.Type               || '';
  document.getElementById('f-priority').value            = t.Priority           || 'Medium';
  document.getElementById('f-status').value              = t.Status             || 'Open';
  document.getElementById('f-stage').value               = t.Stage              || 'Reported';
  document.getElementById('f-requester').value           = t.Requester          || '';
  document.getElementById('f-description').value         = t.Description        || '';
  document.getElementById('f-notes').value               = t.Notes              || '';
  document.getElementById('f-due-date').value            = toDatetimeLocal(t['Due Date']);
  document.getElementById('f-jira-ref').value            = t['Jira Ref']        || '';
  setSelectOrFirst('f-pic-dev',  t['PIC Dev']  || '');
  setSelectOrFirst('f-pic-test', t['PIC Test'] || '');
  setSelectOrFirst('f-pic-impl', t['PIC Impl'] || '');
  document.getElementById('f-release-date').value        = toDatetimeLocal(t['Release Date']);
  document.getElementById('f-release-version').value     = t['Release Version'] || '';
  document.getElementById('f-change-ticket').value       = t['Change Ticket No']|| '';
  document.getElementById('f-cab-date').value            = toDatetimeLocal(t['CAB Date']);
  document.getElementById('f-cab-status').value          = t['CAB Status']      || '';
  fillAssigneeSelect('f-assignee', t.Assignee || '');
  openModal('ticket-modal');
}

async function saveTicket() {
  const id    = document.getElementById('ticket-id').value;
  const title = document.getElementById('f-title').value.trim();
  const type  = document.getElementById('f-type').value;
  const prio  = document.getElementById('f-priority').value;
  if (!title) { alert('Title is required');    return; }
  if (!type)  { alert('Type is required');     return; }
  if (!prio)  { alert('Priority is required'); return; }

  const ticket = {
    id,
    'Title':              title,
    'Type':               type,
    'Priority':           prio,
    'Status':             document.getElementById('f-status').value,
    'Stage':              document.getElementById('f-stage').value,
    'Assignee':           document.getElementById('f-assignee').value,
    'Requester':          document.getElementById('f-requester').value.trim(),
    'Due Date':           document.getElementById('f-due-date').value,
    'Jira Ref':           document.getElementById('f-jira-ref').value.trim(),
    'PIC Dev':            document.getElementById('f-pic-dev').value.trim(),
    'PIC Test':           document.getElementById('f-pic-test').value.trim(),
    'PIC Impl':           document.getElementById('f-pic-impl').value.trim(),
    'Release Date':       document.getElementById('f-release-date').value,
    'Release Version':    document.getElementById('f-release-version').value.trim(),
    'Change Ticket No':   document.getElementById('f-change-ticket').value.trim(),
    'CAB Date':           document.getElementById('f-cab-date').value,
    'CAB Status':         document.getElementById('f-cab-status').value,
    'Description':        document.getElementById('f-description').value.trim(),
    'Notes':              document.getElementById('f-notes').value.trim()
  };

  const btn = document.querySelector('#ticket-modal .btn-primary');
  btn.textContent = 'Saving…'; btn.disabled = true;
  try {
    const res = await apiPost({ action: id ? 'updateTicket' : 'createTicket', ticket });
    if (res.error) throw new Error(res.error);
    closeModal('ticket-modal');
    await loadTickets();
  } catch (err) { alert('Error: ' + err.message); }
  finally { btn.textContent = 'Save Ticket'; btn.disabled = false; }
}

// ---- Progress Tracking (for Jira tickets) ----

function openProgressModal(id) {
  const t = tickets.find(t => t.ID === id);
  if (!t) return;
  currentDetailId = id;

  document.getElementById('prog-jira-id').textContent = t.ID + ' — ' + t.Title;
  document.getElementById('p-stage').value            = t.Stage              || 'Reported';
  setSelectOrFirst('p-pic-dev',  t['PIC Dev']  || '');
  setSelectOrFirst('p-pic-test', t['PIC Test'] || '');
  setSelectOrFirst('p-pic-impl', t['PIC Impl'] || '');
  document.getElementById('p-release-date').value     = toDatetimeLocal(t['Release Date']);
  document.getElementById('p-release-version').value  = t['Release Version'] || '';
  document.getElementById('p-change-ticket').value    = t['Change Ticket No']|| '';
  document.getElementById('p-cab-date').value         = toDatetimeLocal(t['CAB Date']);
  document.getElementById('p-cab-status').value       = t['CAB Status']      || '';
  document.getElementById('p-notes').value            = t.Notes              || '';

  // Show/hide Remove button based on whether progress exists
  document.getElementById('p-delete-btn').style.display = t.HasProgress ? '' : 'none';

  closeModal('detail-modal');
  openModal('progress-modal');
}

async function saveProgress() {
  const id = currentDetailId;
  const progress = {
    'Jira ID':          id,
    'Stage':            document.getElementById('p-stage').value,
    'PIC Dev':          document.getElementById('p-pic-dev').value.trim(),
    'PIC Test':         document.getElementById('p-pic-test').value.trim(),
    'PIC Impl':         document.getElementById('p-pic-impl').value.trim(),
    'Release Date':     document.getElementById('p-release-date').value,
    'Release Version':  document.getElementById('p-release-version').value.trim(),
    'Change Ticket No': document.getElementById('p-change-ticket').value.trim(),
    'CAB Date':         document.getElementById('p-cab-date').value,
    'CAB Status':       document.getElementById('p-cab-status').value,
    'Notes':            document.getElementById('p-notes').value.trim()
  };

  const btn = document.querySelector('#progress-modal .btn-primary');
  btn.textContent = 'Saving…'; btn.disabled = true;
  try {
    const res = await apiPost({ action: 'saveProgress', progress });
    if (res.error) throw new Error(res.error);
    closeModal('progress-modal');
    await loadTickets();
  } catch (err) { alert('Error: ' + err.message); }
  finally { btn.textContent = 'Save Progress'; btn.disabled = false; }
}

async function deleteProgress() {
  if (!confirm('Remove progress tracking for this ticket?')) return;
  try {
    const res = await apiPost({ action: 'deleteProgress', jiraId: currentDetailId });
    if (res.error) throw new Error(res.error);
    closeModal('progress-modal');
    await loadTickets();
  } catch (err) { alert('Error: ' + err.message); }
}

// ---- View Detail ----

function viewTicket(id) {
  const t = tickets.find(t => t.ID === id);
  if (!t) return;
  currentDetailId = id;
  const isJira = t.Source === 'Jira';

  // Badge
  document.getElementById('detail-id-badge').innerHTML = isJira
    ? `<a class="jira-id" href="${x(t.URL)}" target="_blank">${x(t.ID)}</a> <span class="src-badge src-jira">Jira</span>`
    : `<span class="manual-id">${x(t.ID)}</span> <span class="src-badge src-manual">Manual</span>`;
  document.getElementById('detail-title').textContent = t.Title;

  // Footer
  document.getElementById('detail-footer').innerHTML = isJira
    ? `<button class="btn btn-outline" onclick="openProgressModal('${x(t.ID)}')" style="margin-right:auto">
         📊 ${t.HasProgress ? 'Update Progress' : 'Track Progress'}
       </button>
       <button class="btn btn-outline" onclick="closeModal('detail-modal')">Close</button>
       <a class="btn btn-primary" href="${x(t.URL)}" target="_blank">↗ Open in Jira</a>`
    : `<button class="btn btn-danger"  onclick="confirmDelete()">Delete</button>
       <button class="btn btn-outline" onclick="closeModal('detail-modal')">Close</button>
       <button class="btn btn-primary" onclick="editFromDetail()">Edit</button>`;

  // Pipeline
  const currentIdx = STAGES.indexOf(t.Stage || '');
  const pipeline = STAGES.map((s, i) => {
    const cls = i < currentIdx ? 'done' : i === currentIdx ? 'active' : '';
    return `<div class="pipeline-step ${cls}">
      <div class="pipeline-dot">${i < currentIdx ? '✓' : i + 1}</div>
      <div class="pipeline-label">${x(s)}</div>
    </div>`;
  }).join('');

  const fmt = d => {
    if (!d) return '—';
    const hasTime = d.length > 10;
    const dt = new Date(hasTime ? d : d + 'T00:00:00');
    if (isNaN(dt)) return d;
    const dateStr = dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    return hasTime ? dateStr + ' ' + dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : dateStr;
  };
  const cabCls = t['CAB Status']==='Approved' ? 'cab-approved' : t['CAB Status']==='Rejected' ? 'cab-rejected' : 'cab-pending';

  document.getElementById('detail-body').innerHTML = `
    ${t.Stage || t.HasProgress ? `<div class="pipeline">${pipeline}</div>` : ''}

    <div class="detail-section-title">Overview</div>
    <div class="detail-grid">
      <div class="detail-field"><label>Status</label>
        <div class="val">
          <span class="badge s-${slug(t.Status||'')}">${x(t.Status||'—')}</span>
          ${isJira && t['Jira Status'] ? `<span style="font-size:11px;color:#9CA3AF;margin-left:6px">(Jira: ${x(t['Jira Status'])})</span>` : ''}
        </div></div>
      <div class="detail-field"><label>Priority</label>
        <div class="val"><span class="badge p-${slug(t.Priority||'')}">${x(t.Priority||'—')}</span></div></div>
      <div class="detail-field"><label>Type</label>
        <div class="val"><span class="badge badge-type">${x(t.Type||'—')}</span></div></div>
      <div class="detail-field"><label>Project</label>
        <div class="val">${x(t.Project||'—')}</div></div>
      <div class="detail-field"><label>Assignee</label>
        <div class="val">${x(t.Assignee||'—')}</div></div>
      <div class="detail-field"><label>Requester</label>
        <div class="val">${x(t.Requester||'—')}</div></div>
      <div class="detail-field"><label>Due Date</label>
        <div class="val">${fmt(t['Due Date'])}</div></div>
      <div class="detail-field"><label>Created</label>
        <div class="val">${fmt(t['Created Date'])}</div></div>
      ${!isJira && t['Jira Ref'] ? `
      <div class="detail-field"><label>Jira Reference</label>
        <div class="val"><a href="https://privasia.atlassian.net/browse/${x(t['Jira Ref'])}" target="_blank" style="color:#2563EB">${x(t['Jira Ref'])}</a></div></div>` : ''}
    </div>

    ${(t['PIC Dev'] || t['PIC Test'] || t['PIC Impl']) ? `
    <div class="detail-section-title">Person in Charge</div>
    <div class="detail-grid">
      <div class="detail-field"><label>PIC Developer</label><div class="val">${x(t['PIC Dev']||'—')}</div></div>
      <div class="detail-field"><label>PIC Tester</label><div class="val">${x(t['PIC Test']||'—')}</div></div>
      <div class="detail-field"><label>PIC Implementor</label><div class="val">${x(t['PIC Impl']||'—')}</div></div>
    </div>` : ''}

    ${(t['Release Date'] || t['Release Version'] || t['Change Ticket No'] || t['CAB Status']) ? `
    <div class="detail-section-title">Release &amp; CAB</div>
    <div class="detail-grid">
      <div class="detail-field"><label>Release Date</label><div class="val">${fmt(t['Release Date'])}</div></div>
      <div class="detail-field"><label>Release Version</label><div class="val">${x(t['Release Version']||'—')}</div></div>
      <div class="detail-field"><label>Change Ticket No</label><div class="val">${x(t['Change Ticket No']||'—')}</div></div>
      <div class="detail-field"><label>CAB Date</label><div class="val">${fmt(t['CAB Date'])}</div></div>
      <div class="detail-field"><label>CAB Status</label>
        <div class="val">${t['CAB Status'] ? `<span class="badge ${cabCls}">${x(t['CAB Status'])}</span>` : '—'}</div></div>
    </div>` : ''}

    <div class="detail-section-title">Description</div>
    <div class="detail-text" style="margin-bottom:12px">${x(t.Description||'—')}</div>

    ${t.Notes ? `<div class="detail-section-title">Notes</div>
    <div class="detail-text" style="margin-bottom:12px">${x(t.Notes)}</div>` : ''}

    <div class="detail-section-title">Documents</div>
    <div id="detail-docs-list"></div>
    <div class="doc-upload-row" style="margin-top:10px">
      <select id="doc-type-select" class="filter-select" style="font-size:12px;padding:6px 8px">
        <option>URS</option>
        <option>Test Document</option>
        <option>DB Script</option>
        <option>MOP</option>
        <option>Release Note</option>
        <option>Sign-off</option>
        <option>Others</option>
      </select>
      <label class="doc-file-label">
        📎 Choose file
        <input type="file" id="doc-file-input" style="display:none" onchange="updateFileName(this)">
      </label>
      <span id="doc-file-name" style="font-size:12px;color:#6B7280;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
      <button id="doc-upload-btn" class="btn btn-primary btn-sm" onclick="handleFileUpload('${x(t.ID)}')">↑ Upload</button>
    </div>
  `;

  openModal('detail-modal');
  loadDocuments(t.ID);
}

function editFromDetail() { closeModal('detail-modal'); editTicket(currentDetailId); }

// ---- Documents ----

async function loadDocuments(ticketId) {
  const section = document.getElementById('detail-docs-list');
  if (!section) return;
  section.innerHTML = '<p style="color:#9CA3AF;font-size:12px;padding:8px 0">Loading…</p>';
  try {
    const docs = await apiGet({ action: 'getDocuments', ticketId });
    if (!Array.isArray(docs) || docs.length === 0) {
      section.innerHTML = '<p style="color:#9CA3AF;font-size:12px;padding:8px 0">No documents yet.</p>';
      return;
    }
    section.innerHTML = docs.map(d => {
      const icon = docIcon(d['Doc Type']);
      const kb   = d['Size (KB)'] ? d['Size (KB)'] + ' KB' : '';
      return `<div class="doc-item">
        <span class="doc-icon">${icon}</span>
        <div class="doc-info">
          <div class="doc-name">${x(d['File Name'])}</div>
          <div class="doc-meta"><span class="doc-type-tag">${x(d['Doc Type'])}</span> ${kb ? `<span style="color:#9CA3AF">${kb}</span>` : ''}</div>
        </div>
        <div class="doc-actions">
          <a class="doc-btn doc-view" href="${x(d['View URL'])}" target="_blank">View</a>
          <a class="doc-btn doc-dl"   href="${x(d['Download URL'])}" target="_blank">↓ Download</a>
          <button class="doc-btn doc-del" onclick="deleteDocument('${x(d['ID'])}','${x(ticketId)}')">✕</button>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    section.innerHTML = `<p style="color:#EF4444;font-size:12px;padding:8px 0">Could not load documents: ${x(e.message)}</p>`;
  }
}

async function handleFileUpload(ticketId) {
  const input   = document.getElementById('doc-file-input');
  const docType = document.getElementById('doc-type-select').value || 'Others';
  const file    = input.files[0];
  if (!file) { alert('Please select a file first.'); return; }
  if (file.size > 8 * 1024 * 1024) { alert('File is too large. Maximum size is 8MB.'); return; }

  const uploadBtn = document.getElementById('doc-upload-btn');
  uploadBtn.textContent = 'Uploading…'; uploadBtn.disabled = true;

  try {
    const base64 = await toBase64(file);
    const res = await apiPost({
      action:   'uploadDocument',
      ticketId: ticketId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      docType:  docType,
      base64:   base64,
      size:     file.size
    });
    if (res.error) throw new Error(res.error);
    input.value = '';
    await loadDocuments(ticketId);
  } catch(err) {
    alert('Upload failed: ' + err.message);
  } finally {
    uploadBtn.textContent = '↑ Upload'; uploadBtn.disabled = false;
  }
}

async function deleteDocument(docId, ticketId) {
  if (!confirm('Delete this document? It will be removed from Google Drive.')) return;
  try {
    const res = await apiPost({ action: 'deleteDocument', docId });
    if (res.error) throw new Error(res.error);
    await loadDocuments(ticketId);
  } catch(err) { alert('Error: ' + err.message); }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function updateFileName(input) {
  const label = document.getElementById('doc-file-name');
  if (label) label.textContent = input.files[0] ? input.files[0].name : '';
}

function docIcon(type) {
  const map = {
    'URS': '📄', 'Test Document': '🧪', 'DB Script': '🗄️',
    'MOP': '📋', 'Release Note': '📝', 'Sign-off': '✍️'
  };
  return map[type] || '📎';
}

async function confirmDelete() {
  if (!confirm('Delete this ticket? This cannot be undone.')) return;
  try {
    const res = await apiPost({ action: 'deleteTicket', id: currentDetailId });
    if (res.error) throw new Error(res.error);
    closeModal('detail-modal'); await loadTickets();
  } catch (err) { alert('Error: ' + err.message); }
}

async function deleteTicket(id) {
  if (!confirm('Delete this ticket?')) return;
  try {
    const res = await apiPost({ action: 'deleteTicket', id });
    if (res.error) throw new Error(res.error);
    await loadTickets();
  } catch (err) { alert('Error: ' + err.message); }
}

// ---- Assignees ----

async function loadAssignees() {
  if (!API_URL) return;
  try {
    const data = await apiGet({ action: 'getAssignees' });
    if (Array.isArray(data)) { assignees = data; renderAssigneesList(); refreshAssigneeDropdown(); }
  } catch (e) { console.warn('Assignees:', e.message); }
}

function refreshAssigneeDropdown() {
  const sel = document.getElementById('filter-assignee'), cur = sel.value;
  sel.innerHTML = '<option value="">All Assignees</option>' +
    assignees.map(a => `<option value="${x(a.name)}">${x(a.name)}</option>`).join('');
  sel.value = cur;
}

function fillAssigneeSelect(selId, selected) {
  document.getElementById(selId).innerHTML = '<option value="">Unassigned</option>' +
    assignees.map(a => `<option value="${x(a.name)}"${a.name===selected?' selected':''}>${x(a.name)}</option>`).join('');
}

function renderAssigneesList() {
  document.getElementById('assignees-list').innerHTML = assignees.map(a =>
    `<span class="assignee-tag">${x(a.name)}${a.email?` <span style="color:#9CA3AF">&lt;${x(a.email)}&gt;</span>`:''}
     <button onclick="removeAssignee('${x(a.name)}')" title="Remove">✕</button></span>`
  ).join('');
}

async function addAssignee() {
  const name  = document.getElementById('new-assignee-name').value.trim();
  const email = document.getElementById('new-assignee-email').value.trim();
  if (!name) { alert('Name is required'); return; }
  try {
    const res = await apiPost({ action: 'addAssignee', name, email });
    if (res.error) throw new Error(res.error);
    document.getElementById('new-assignee-name').value  = '';
    document.getElementById('new-assignee-email').value = '';
    await loadAssignees();
  } catch (err) { alert('Error: ' + err.message); }
}

async function removeAssignee(name) {
  if (!confirm(`Remove "${name}"?`)) return;
  try {
    const res = await apiPost({ action: 'removeAssignee', name });
    if (res.error) throw new Error(res.error);
    await loadAssignees();
  } catch (err) { alert('Error: ' + err.message); }
}

// ---- Settings ----

function openSettings() {
  document.getElementById('api-url').value = API_URL;
  document.getElementById('conn-status').textContent = '';
  document.getElementById('conn-status').className   = 'conn-status';
  renderAssigneesList();
  openModal('settings-modal');
}

function saveApiUrl() {
  const url = document.getElementById('api-url').value.trim();
  API_URL   = url;
  localStorage.setItem('tracker_api_url', url);
  document.getElementById('config-banner').classList.toggle('hidden', !!url);
  setStatus('Saved.', 'ok');
  if (url) { loadTickets(); loadAssignees(); }
}

async function testConnection() {
  const url = document.getElementById('api-url').value.trim();
  if (!url) { alert('Enter a URL first'); return; }
  setStatus('Testing…', '');
  try {
    const u = new URL(url); u.searchParams.set('action', 'getAllTickets');
    const data = JSON.parse(await (await fetch(u.toString(), { redirect: 'follow' })).text());
    if (data.error) throw new Error(data.error);
    const list = data.tickets || (Array.isArray(data) ? data : []);
    const j = list.filter(t => t.Source === 'Jira').length;
    const m = list.filter(t => t.Source === 'Manual').length;
    if (data.jiraError) setStatus(`⚠ Connected — Jira error: ${data.jiraError}`, 'err');
    else setStatus(`✓ Connected — ${j} Jira + ${m} manual`, 'ok');
  } catch (err) { setStatus('✗ ' + err.message, 'err'); }
}

function setStatus(msg, cls) {
  const el = document.getElementById('conn-status');
  el.textContent = msg; el.className = 'conn-status' + (cls ? ' ' + cls : '');
}

// ---- Banners ----

function showBanner(id, icon, msg, bg, color) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div'); el.id = id;
    el.style.cssText = 'border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px;display:flex;gap:8px;align-items:center;border:1px solid rgba(0,0,0,0.08)';
    document.querySelector('.main').insertBefore(el, document.querySelector('.ticket-container'));
  }
  el.style.background = bg; el.style.color = color;
  el.innerHTML = `<span>${icon}</span><span>${x(msg)}</span>`;
}

function hideBanner(id) { const el = document.getElementById(id); if (el) el.remove(); }

// ---- View Switching ----

function showView(view) {
  document.getElementById('view-tickets').classList.toggle('hidden', view !== 'tickets');
  document.getElementById('view-dashboard').classList.toggle('hidden', view !== 'dashboard');
  document.getElementById('tab-tickets').classList.toggle('active', view === 'tickets');
  document.getElementById('tab-dashboard').classList.toggle('active', view === 'dashboard');
  if (view === 'dashboard') renderDashboard();
}

// ---- Dashboard ----

function renderDashboard() {
  const active = tickets.filter(t => t.Status !== 'Closed' && t.Status !== 'Resolved');

  renderDashSummary(active);
  renderDevCards(active);
  renderProgressTable(active);
  renderCharts(active);
}

function renderDashSummary(active) {
  const total   = tickets.length;
  const open    = tickets.filter(t => t.Status === 'Open').length;
  const inprog  = tickets.filter(t => t.Status === 'In Progress').length;
  const pending = tickets.filter(t => t.Status === 'Pending').length;
  const overdue = tickets.filter(t => {
    if (!t['Due Date']) return false;
    return new Date(t['Due Date'] + 'T00:00:00') < new Date();
  }).length;
  const noStage = active.filter(t => !t.Stage && t.Source === 'Manual').length;

  document.getElementById('dash-summary').innerHTML = [
    { n: total,   l: 'Total Tickets',    c: '' },
    { n: open,    l: 'Open',             c: 'c-open' },
    { n: inprog,  l: 'In Progress',      c: 'c-ip' },
    { n: pending, l: 'Pending',          c: 'c-pend' },
    { n: overdue, l: 'Overdue',          c: 'c-crit' },
    { n: noStage, l: 'No Stage Set',     c: 'c-warn' }
  ].map(s => `
    <div class="dash-sum-card">
      <div class="dash-sum-num ${s.c}">${s.n}</div>
      <div class="dash-sum-lbl">${s.l}</div>
    </div>`).join('');
}

function renderDevCards(active) {
  const grid = document.getElementById('dash-dev-cards');
  const cards = DEVS.map(dev => {
    const devTickets = active.filter(t =>
      t['PIC Dev'] === dev || t['PIC Test'] === dev || t.Assignee === dev
    );
    if (!devTickets.length) return `
      <div class="dev-card dev-card-empty">
        <div class="dev-avatar">${dev[0]}</div>
        <div class="dev-name">${dev}</div>
        <div class="dev-count">No active tickets</div>
      </div>`;

    const rows = devTickets.slice(0, 5).map(t => {
      const pct  = STAGE_PCT[t.Stage] || 0;
      const role = t['PIC Dev'] === dev ? '🔨 Dev'
                 : t['PIC Test'] === dev ? '🧪 Test'
                 : '📌 Assigned';
      const pCls = 'p-' + slug(t.Priority || '');
      return `
        <div class="dev-ticket" onclick="viewTicket('${x(t.ID)}');showView('tickets')">
          <div class="dev-ticket-top">
            <span class="dev-ticket-id">${x(t.ID)}</span>
            <span class="badge ${pCls}" style="font-size:10px">${x(t.Priority||'')}</span>
            <span class="dev-role-tag">${role}</span>
          </div>
          <div class="dev-ticket-title">${x(t.Title)}</div>
          <div class="dev-ticket-stage">${x(t.Stage||'Not set')}</div>
          <div class="prog-bar-wrap">
            <div class="prog-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="prog-pct">${pct}%</div>
        </div>`;
    }).join('');

    const more = devTickets.length > 5
      ? `<div style="font-size:11px;color:#9CA3AF;padding:6px 0;text-align:center">+${devTickets.length - 5} more</div>`
      : '';

    return `
      <div class="dev-card">
        <div class="dev-card-header">
          <div class="dev-avatar">${dev[0]}</div>
          <div>
            <div class="dev-name">${dev}</div>
            <div class="dev-count">${devTickets.length} active ticket${devTickets.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="dev-tickets">${rows}${more}</div>
      </div>`;
  }).join('');

  grid.innerHTML = cards;
}

function renderProgressTable(active) {
  const tbody = document.getElementById('dash-progress-tbody');
  const sorted = [...active].sort((a, b) => {
    return (STAGE_PCT[b.Stage] || 0) - (STAGE_PCT[a.Stage] || 0);
  });

  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9CA3AF;padding:20px">No active tickets</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(t => {
    const pct  = STAGE_PCT[t.Stage] || 0;
    const sCls = 's-' + slug(t.Status || '');
    const isJira = t.Source === 'Jira';
    const idHtml = isJira
      ? `<a class="jira-id" href="${x(t.URL)}" target="_blank">${x(t.ID)}</a>`
      : `<span class="manual-id">${x(t.ID)}</span>`;
    return `
      <tr>
        <td class="id-cell">${idHtml}</td>
        <td>
          <div class="t-title" onclick="viewTicket('${x(t.ID)}');showView('tickets')">${x(t.Title)}</div>
          <div class="t-sub"><span class="badge ${sCls}" style="font-size:10px">${x(t.Status||'')}</span></div>
        </td>
        <td>${t['PIC Dev']  ? `<span class="pic-chip">${x(t['PIC Dev'])}</span>`  : '<span style="color:#9CA3AF">—</span>'}</td>
        <td>${t['PIC Test'] ? `<span class="pic-chip">${x(t['PIC Test'])}</span>` : '<span style="color:#9CA3AF">—</span>'}</td>
        <td>${t['PIC Impl'] ? `<span class="pic-chip impl">${x(t['PIC Impl'])}</span>` : '<span style="color:#9CA3AF">—</span>'}</td>
        <td><span class="stage-badge">${x(t.Stage || 'Not set')}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="prog-bar-wrap" style="flex:1">
              <div class="prog-bar-fill ${pct === 100 ? 'done' : pct >= 70 ? 'near' : ''}" style="width:${pct}%"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${pct===100?'#059669':pct>=70?'#D97706':'#4F46E5'};min-width:32px">${pct}%</span>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function renderCharts(active) {
  // Destroy existing charts
  if (chartDev)    { chartDev.destroy();    chartDev    = null; }
  if (chartStage)  { chartStage.destroy();  chartStage  = null; }
  if (chartStatus) { chartStatus.destroy(); chartStatus = null; }

  // Chart 1: Workload by Developer
  const devCounts = DEVS.map(dev =>
    active.filter(t => t['PIC Dev'] === dev || t['PIC Test'] === dev || t.Assignee === dev).length
  );
  chartDev = new Chart(document.getElementById('chart-dev'), {
    type: 'bar',
    data: {
      labels: DEVS,
      datasets: [{
        label: 'Active Tickets',
        data: devCounts,
        backgroundColor: '#4F46E5',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });

  // Chart 2: Tickets by Stage
  const stageCounts = STAGES.map(s => active.filter(t => t.Stage === s).length);
  const noStageCnt  = active.filter(t => !t.Stage).length;
  chartStage = new Chart(document.getElementById('chart-stage'), {
    type: 'bar',
    data: {
      labels: [...STAGES, 'Not Set'],
      datasets: [{
        label: 'Tickets',
        data: [...stageCounts, noStageCnt],
        backgroundColor: [
          '#E0E7FF','#C7D2FE','#A5B4FC','#818CF8',
          '#6366F1','#4F46E5','#4338CA','#3730A3',
          '#312E81','#10B981','#9CA3AF'
        ],
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });

  // Chart 3: Tickets by Status
  const statusLabels = ['Open','In Progress','Pending','Resolved','Closed'];
  const statusColors = ['#3B82F6','#F59E0B','#8B5CF6','#10B981','#9CA3AF'];
  const statusData   = statusLabels.map(s => tickets.filter(t => t.Status === s).length);
  chartStatus = new Chart(document.getElementById('chart-status'), {
    type: 'doughnut',
    data: {
      labels: statusLabels,
      datasets: [{ data: statusData, backgroundColor: statusColors, borderWidth: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
    }
  });
}

// ---- Modal & Utils ----

function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function show(id)       { document.getElementById(id).classList.remove('hidden'); }
function slug(s)        { return s.toLowerCase().replace(/\s+/g, '-'); }

function toDatetimeLocal(val) {
  if (!val) return '';
  if (val.length > 10 && val.includes('T')) return val.slice(0, 16);
  return val + 'T00:00';
}

function dueFmt(d) {
  if (!d) return '<span style="color:#9CA3AF">—</span>';
  const hasTime = d.length > 10;
  const dt = new Date(hasTime ? d : d + 'T00:00:00');
  if (isNaN(dt)) return '<span style="color:#9CA3AF">—</span>';
  const now = new Date();
  const today = new Date(); today.setHours(0,0,0,0);
  const dtDay = new Date(dt); dtDay.setHours(0,0,0,0);
  const diff  = (dtDay - today) / 86400000;
  const dateStr = dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const timeStr = hasTime ? ' ' + dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '';
  const lbl = dateStr + timeStr;
  if (hasTime ? dt < now : diff < 0) return `<span class="due overdue">⚠ ${lbl}</span>`;
  if (diff === 0) return `<span class="due today">${hasTime ? lbl : 'Today'}</span>`;
  if (diff <= 3)  return `<span class="due soon">${lbl}</span>`;
  return `<span class="due ok">${lbl}</span>`;
}

// Set a select value; falls back to empty if value not in options
function setSelectOrFirst(id, value) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const exists = Array.from(sel.options).some(o => o.value === value);
  sel.value = exists ? value : '';
}

function x(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
