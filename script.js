(function() {
  'use strict';

  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));

  // Telemetry keys
  const KEYS = {
    SESSION_START: 'SESSION_START',
    CHALLENGE_ATTEMPT: 'CHALLENGE_ATTEMPT',
    CHALLENGE_SUCCESS: 'CHALLENGE_SUCCESS',
    CHALLENGE_FAILURE: 'CHALLENGE_FAILURE'
  };

  // Session
  const sessionId = (function(){
    let id = localStorage.getItem('CURRENT_SESSION_ID');
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
      localStorage.setItem('CURRENT_SESSION_ID', id);
      pushEvent(KEYS.SESSION_START, { sessionId: id, at: Date.now() });
    }
    return id;
  })();

  // Flags - stored as small obfuscated parts, then joined and base64-encoded at runtime
  const flagsPlain = {
    L1: ['JAPX','COM','{intip','_file_ra','hasia','_mall}'].join(''),
    L2: ['JAPX','COM','{belanja_','gratis_','hacker_','batam}'].join(''),
    L3: ['JAPX','COM','{db_kam','u_kurang','_sanitisa','si}'].join(''),
    L4: ['JAPX','COM','{xss_ale','rt_bobo','l_browse','r}'].join('')
  };
  const flagsB64 = {
    L1: btoa(flagsPlain.L1),
    L2: btoa(flagsPlain.L2),
    L3: btoa(flagsPlain.L3),
    L4: btoa(flagsPlain.L4)
  };

  // LocalStorage helpers
  function getArr(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }
  function setArr(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }
  function pushEvent(key, obj) {
    const arr = getArr(key);
    arr.push(Object.assign({ ts: Date.now(), sessionId }, obj));
    setArr(key, arr);
    if (key !== KEYS.SESSION_START) appendLiveLog(key, obj);
  }

  // Live log UI
  function appendLiveLog(type, obj) {
    const ul = qs('#logList');
    if (!ul) return;
    const li = document.createElement('li');
    li.className = 'log-item ' + (/SUCCESS/.test(type) ? 'log-good' : /FAILURE/.test(type) ? 'log-bad' : '');
    const t = new Date(obj.ts || Date.now()).toLocaleTimeString();
    li.textContent = `[${t}] ${type} :: L${obj.level || '?'} :: ${obj.msg || ''}`;
    ul.prepend(li);
    // cap list
    while (ul.children.length > 50) ul.removeChild(ul.lastChild);
  }

  // SPA Tabs
  function setupTabs() {
    qsa('.tab').forEach(btn => {
      if (btn.id === 'boothLink') return;
      btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });
    const boothLink = qs('#boothLink');
    boothLink.addEventListener('click', (e) => {
      e.preventDefault();
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'booth');
      window.location.href = url.toString();
    });
  }
  function activateTab(id) {
    qsa('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    qsa('.panel').forEach(p => p.classList.toggle('active', p.id === id));
  }

  // Level 1
  function setupLevel1() {
    const grid = qs('#dirGrid');
    grid.addEventListener('click', onFileClick);
    grid.addEventListener('keydown', (e) => { if (e.key === 'Enter') onFileClick(e); });
    function onFileClick(e) {
      const tgt = e.target.closest('.file');
      if (!tgt) return;
      const name = tgt.getAttribute('data-name');
      pushEvent(KEYS.CHALLENGE_ATTEMPT, { level: 1, msg: `open ${name}` });
      if (name === 'database_backup_2026.conf') {
        const flag = flagsB64.L1;
        openModal('Protected Preview', `Base64 FLAG 1:<br><code>${flag}</code>`, { level: 1, flagId: 'L1' });
        pushEvent(KEYS.CHALLENGE_SUCCESS, { level: 1, msg: 'FLAG 1 revealed', flagId: 'L1' });
      } else {
        openModal('Preview', `<em>Tidak ada konten berharga pada ${name}</em>`);
        pushEvent(KEYS.CHALLENGE_FAILURE, { level: 1, msg: `wrong file ${name}` });
      }
    }
  }

  // Level 2
  function setupLevel2() {
    const priceInput = qs('#priceInput');
    const btn = qs('#checkoutBtn');
    const res = qs('#checkoutResult');
    btn.addEventListener('click', () => {
      const val = Number(priceInput.value);
      pushEvent(KEYS.CHALLENGE_ATTEMPT, { level: 2, msg: `checkout Rp${val}` });
      if (val <= 0) {
        const flag = flagsB64.L2;
        res.innerHTML = `Checkout gratis aktif. Base64 FLAG 2: <code>${flag}</code>`;
        pushEvent(KEYS.CHALLENGE_SUCCESS, { level: 2, msg: 'Free checkout achieved', flagId: 'L2' });
        openCopyModal('Checkout Gratis', `Base64 FLAG 2:<br><code>${flag}</code>`, flag);
      } else {
        const total = val; // simplistic subtotal
        res.textContent = `Dikenakan biaya: Rp${total.toLocaleString('id-ID')}`;
        pushEvent(KEYS.CHALLENGE_FAILURE, { level: 2, msg: 'No bypass' });
      }
    });
  }

  // Level 3
  function setupLevel3() {
    const user = qs('#user');
    const pass = qs('#pass');
    const btn = qs('#loginBtn');
    const res = qs('#loginResult');
    btn.addEventListener('click', () => {
      const u = String(user.value || '');
      const p = String(pass.value || '');
      pushEvent(KEYS.CHALLENGE_ATTEMPT, { level: 3, msg: `login u=${u}` });
      const patterns = ["admin' --", "admin' OR '1'='1"]; // explicit
      const containsOr = /'\s*OR\s*'/i.test(u) || /'\s*OR\s*'/i.test(p);
      const matched = patterns.includes(u) || patterns.includes(p) || containsOr;
      if (matched) {
        res.innerHTML = `<span class="log-good">Admin panel emulated. Access granted.</span>`;
        const flag = flagsB64.L3;
        openCopyModal('Admin Panel', `Base64 FLAG 3:<br><code>${flag}</code>`, flag);
        pushEvent(KEYS.CHALLENGE_SUCCESS, { level: 3, msg: 'Admin bypass', flagId: 'L3' });
      } else {
        res.innerHTML = `<span class="log-bad">Kredensial salah. Coba pola injeksi.</span>`;
        pushEvent(KEYS.CHALLENGE_FAILURE, { level: 3, msg: 'Bad creds' });
      }
    });
  }

  // Level 4
  function setupLevel4() {
    const ta = qs('#review');
    const btn = qs('#reviewBtn');
    const list = qs('#reviews');
    const res = qs('#xssResult');
    btn.addEventListener('click', () => {
      const txt = String(ta.value || '');
      pushEvent(KEYS.CHALLENGE_ATTEMPT, { level: 4, msg: 'submit review' });
      const lower = txt.toLowerCase();
      if (lower.includes('<script>') || lower.includes('<marquee>')) {
        alert('XSS payload executed');
        res.innerHTML = `XSS terdeteksi. <span class="log-good">Payload dieksekusi.</span>`;
        const flag = flagsB64.L4;
        openCopyModal('XSS Triggered', `Base64 FLAG 4:<br><code>${flag}</code>`, flag);
        pushEvent(KEYS.CHALLENGE_SUCCESS, { level: 4, msg: 'XSS alert fired', flagId: 'L4' });
      } else {
        // sanitize basic
        const safe = txt.replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]));
        const li = document.createElement('li');
        li.textContent = safe;
        list.prepend(li);
        res.textContent = 'Tersimpan.';
        pushEvent(KEYS.CHALLENGE_FAILURE, { level: 4, msg: 'No XSS' });
      }
    });
  }

  // Copy helper
  function copyText(text) {
    try { navigator.clipboard.writeText(text); } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
  }

  // Accordions copy buttons
  function setupAccCopy() {
    qsa('.copy').forEach(btn => btn.addEventListener('click', () => {
      copyText(btn.getAttribute('data-copy'));
    }));
  }

  // Modal helpers
  function openModal(title, html, meta) {
    const modal = qs('#modal');
    qs('#modalTitle').textContent = title;
    qs('#modalBody').innerHTML = html;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }
  function openCopyModal(title, html, copyVal) {
    openModal(title, `${html}<div><button id="modalCopy" class="primary">Copy</button></div>`);
    setTimeout(() => {
      const b = qs('#modalCopy');
      if (b) b.addEventListener('click', () => copyText(copyVal));
    }, 0);
  }
  function closeModal() {
    const modal = qs('#modal');
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    qs('#modalBody').innerHTML = '';
  }

  function setupModal() {
    qs('#modalClose').addEventListener('click', closeModal);
    qs('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  }

  // Booth dashboard
  function bootBoothIfNeeded() {
    const url = new URL(window.location.href);
    if (url.searchParams.get('view') === 'booth') {
      renderBooth();
      return true;
    }
    return false;
  }

  function renderBooth() {
    document.body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'booth';
    wrap.innerHTML = `
      <h2 class="term-title">Master Command Center</h2>
      <div class="stat-grid">
        <div class="stat"><h4>Total Connected Devices</h4><div id="statDevices">0</div></div>
        <div class="stat"><h4>Unified Flags Captured</h4><div id="statFlags">0</div></div>
        <div class="stat"><h4>Failure Rate</h4><div id="statFail">0%</div></div>
        <div class="stat"><h4>Total Attempts</h4><div id="statAttempts">0</div></div>
      </div>
      <h3 style="margin:10px 0 6px; color:#22d3ee">Live Execution Log</h3>
      <div id="ticker" class="ticker"></div>
      <h3 style="margin:10px 0 6px; color:#22d3ee">Level Progression</h3>
      <div class="bars">
        ${[1,2,3,4].map(i => (
          `<div class="bar">
            <div class="bar-label"><span>Level ${i}</span><span id="barPct${i}">0%</span></div>
            <div class="bar-track"><div class="bar-fill" id="barFill${i}"></div></div>
          </div>`
        )).join('')}
      </div>
    `;
    document.body.appendChild(wrap);
    refreshBooth();
    setInterval(refreshBooth, 3000);
  }

  function refreshBooth() {
    const starts = getArr(KEYS.SESSION_START);
    const attempts = getArr(KEYS.CHALLENGE_ATTEMPT);
    const successes = getArr(KEYS.CHALLENGE_SUCCESS);
    const failures = getArr(KEYS.CHALLENGE_FAILURE);

    // Stats
    const uniqueSessions = new Set(starts.map(x => x.sessionId)).size;
    const uniqueFlags = new Set(successes.map(x => x.flagId).filter(Boolean)).size;
    const totalAttempts = attempts.length;
    const failRate = totalAttempts ? Math.round((failures.length / totalAttempts) * 100) : 0;

    qs('#statDevices').textContent = String(uniqueSessions);
    qs('#statFlags').textContent = String(uniqueFlags);
    qs('#statFail').textContent = failRate + '%';
    qs('#statAttempts').textContent = String(totalAttempts);

    // Ticker
    const ticker = qs('#ticker');
    const last = [...attempts, ...successes, ...failures].sort((a,b)=> (b.ts||0) - (a.ts||0)).slice(0, 50);
    ticker.innerHTML = last.map(ev => {
      const t = new Date(ev.ts || Date.now()).toLocaleTimeString();
      const kind = ev.flagId ? 'SUCCESS' : (/ATTEMPT/.test(ev.msg || '') ? 'ATTEMPT' : (ev.msg || ''));
      const cls = ev.flagId ? 'tick-good' : (/Failure|No XSS|No bypass|wrong file/.test(ev.msg || '') ? 'tick-bad' : '');
      const lvl = ev.level ? `L${ev.level}` : 'L?';
      return `<div class="${cls}">[${t}] ${lvl} :: ${ev.msg || ''}</div>`;
    }).join('');

    // Bars per level
    for (let i=1;i<=4;i++) {
      const a = attempts.filter(x => x.level === i).length;
      const s = successes.filter(x => x.level === i).length;
      const pct = a ? Math.round((s / a) * 100) : 0;
      const fill = qs('#barFill'+i);
      const lab = qs('#barPct'+i);
      if (fill) fill.style.width = pct + '%';
      if (lab) lab.textContent = pct + '%';
    }
  }

  // DOM ready
  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(() => {
    if (bootBoothIfNeeded()) return;
    setupTabs();
    setupLevel1();
    setupLevel2();
    setupLevel3();
    setupLevel4();
    setupAccCopy();
    setupModal();
  });

})();
