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

  // Flags
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
    const payload = Object.assign({ ts: Date.now(), sessionId }, obj);
    arr.push(payload);
    setArr(key, arr);
  }

  // Micro feedback glows
  function flash(kind) {
    const cls = kind === 'success' ? 'flash-success' : 'flash-failure';
    document.body.classList.add(cls);
    setTimeout(() => document.body.classList.remove(cls), 800);
  }

  // SPA Tabs
  function setupTabs() {
    qsa('.tab').forEach(btn => {
      btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });
  }
  function activateTab(id) {
    qsa('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    qsa('.panel').forEach(p => p.classList.toggle('active', p.id === id));
  }

  // Level 1 - server node scanning
  function setupLevel1() {
    const grid = qs('#dirGrid');
    grid.addEventListener('click', onNodeClick);
    grid.addEventListener('keydown', (e) => { if (e.key === 'Enter') onNodeClick(e); });

    function onNodeClick(e) {
      const tgt = e.target.closest('.node');
      if (!tgt) return;
      const name = tgt.getAttribute('data-name');
      pushEvent(KEYS.CHALLENGE_ATTEMPT, { level: 1, msg: `open ${name}` });
      tgt.classList.add('scanning');
      setTimeout(() => tgt.classList.remove('scanning'), 900);

      if (name === 'database_backup_2026.conf') {
        const flag = flagsB64.L1;
        setTimeout(() => {
          openWinOverlay('Selamat: FLAG 1 Terdeteksi', `Base64 FLAG 1: <code>${flag}</code>`, flag);
          pushEvent(KEYS.CHALLENGE_SUCCESS, { level: 1, msg: 'FLAG 1 revealed', flagId: 'L1' });
          flash('success');
        }, 750);
      } else {
        setTimeout(() => {
          openModal('Pratinjau', `<em>Tidak ada konten berharga pada ${name}</em>`);
          pushEvent(KEYS.CHALLENGE_FAILURE, { level: 1, msg: `wrong file ${name}` });
          flash('failure');
        }, 600);
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
        res.innerHTML = '';
        openWinOverlay('Checkout Gratis Terdeteksi', `Base64 FLAG 2: <code>${flag}</code>`, flag);
        pushEvent(KEYS.CHALLENGE_SUCCESS, { level: 2, msg: 'Free checkout achieved', flagId: 'L2' });
        flash('success');
      } else {
        const total = val;
        res.textContent = `Dikenakan biaya: Rp${total.toLocaleString('id-ID')}`;
        pushEvent(KEYS.CHALLENGE_FAILURE, { level: 2, msg: 'No bypass' });
        flash('failure');
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
        res.innerHTML = '';
        const flag = flagsB64.L3;
        openWinOverlay('Admin Panel Tersimulasikan', `Base64 FLAG 3: <code>${flag}</code>`, flag);
        pushEvent(KEYS.CHALLENGE_SUCCESS, { level: 3, msg: 'Admin bypass', flagId: 'L3' });
        flash('success');
      } else {
        res.innerHTML = `<span style="color:#fb7185">Kredensial salah. Coba pola injeksi.</span>`;
        pushEvent(KEYS.CHALLENGE_FAILURE, { level: 3, msg: 'Bad creds' });
        flash('failure');
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
        res.innerHTML = '';
        const flag = flagsB64.L4;
        openWinOverlay('XSS Terdeteksi dan Dieksekusi', `Base64 FLAG 4: <code>${flag}</code>`, flag);
        pushEvent(KEYS.CHALLENGE_SUCCESS, { level: 4, msg: 'XSS alert fired', flagId: 'L4' });
        flash('success');
      } else {
        const safe = txt.replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]));
        const li = document.createElement('li');
        li.textContent = safe;
        list.prepend(li);
        res.textContent = 'Tersimpan.';
        pushEvent(KEYS.CHALLENGE_FAILURE, { level: 4, msg: 'No XSS' });
        flash('failure');
      }
    });
  }

  // Tactical accordions: decrypt typing effect
  function setupDecryptAccordions() {
    qsa('details.accordion').forEach(det => {
      det.addEventListener('toggle', () => {
        if (det.open) {
          qsa('.decrypt', det).forEach(el => typeReveal(el));
        }
      });
    });
  }
  function typeReveal(el) {
    if (el.dataset.done) return;
    const full = el.textContent;
    el.textContent = '';
    el.dataset.done = '1';
    let i = 0;
    const iv = setInterval(() => {
      el.textContent += full.charAt(i++);
      if (i >= full.length) clearInterval(iv);
    }, 10 + Math.random()*20);
  }

  // Copy helper
  function copyText(text) {
    if (!text) return;
    try { navigator.clipboard.writeText(text); } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
  }

  function setupAccCopy() {
    qsa('.copy').forEach(btn => btn.addEventListener('click', () => {
      copyText(btn.getAttribute('data-copy'));
    }));
  }

  // Generic modal helpers
  function openModal(title, html) {
    const modal = qs('#modal');
    qs('#modalTitle').textContent = title;
    qs('#modalBody').innerHTML = html;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
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

  // Success overlay
  function openWinOverlay(title, html, copyVal) {
    let overlay = qs('#winOverlay');
    const titleEl = qs('#winTitle', overlay);
    const bodyEl = qs('#winBody', overlay);
    const copyBtn = qs('#winCopy', overlay);
    const closeBtn = qs('#winClose', overlay);

    titleEl.textContent = title;
    bodyEl.innerHTML = html;

    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');

    copyBtn.onclick = () => copyText(copyVal || bodyEl.textContent);
    closeBtn.onclick = closeWinOverlay;
  }
  function closeWinOverlay() {
    const overlay = qs('#winOverlay');
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }

  // Booth dashboard router enforcement
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
      <div id="ticker" class="terminal"></div>
      <h3 style="margin:10px 0 6px; color:#22d3ee">Level Progression</h3>
      <div class="radials">
        ${[1,2,3,4].map(i => (
          `<div class=\"rad\">
            <svg width=\"120\" height=\"120\" viewBox=\"0 0 120 120\">
              <circle cx=\"60\" cy=\"60\" r=\"50\" stroke=\"#0b2a4b\" stroke-width=\"10\" fill=\"none\" opacity=\"0.6\"/>
              <circle id=\"rad${i}\" cx=\"60\" cy=\"60\" r=\"50\" stroke=\"url(#grad${i})\" stroke-width=\"10\" fill=\"none\" stroke-linecap=\"round\" transform=\"rotate(-90 60 60)\"/>
              <defs>
                <linearGradient id=\"grad${i}\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">
                  <stop offset=\"0%\" stop-color=\"#34d399\"/>
                  <stop offset=\"100%\" stop-color=\"#22d3ee\"/>
                </linearGradient>
              </defs>
            </svg>
            <div class=\"rad-label\">Level ${i}</div>
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

    const sd = qs('#statDevices'); if (sd) sd.textContent = String(uniqueSessions);
    const sf = qs('#statFlags'); if (sf) sf.textContent = String(uniqueFlags);
    const sfl = qs('#statFail'); if (sfl) sfl.textContent = failRate + '%';
    const sa = qs('#statAttempts'); if (sa) sa.textContent = String(totalAttempts);

    // Ticker - retro typing
    const ticker = qs('#ticker');
    if (ticker) {
      const last = [...attempts, ...successes, ...failures].sort((a,b)=> (b.ts||0) - (a.ts||0)).slice(0, 40);
      ticker.innerHTML = last.map(ev => {
        const t = new Date(ev.ts || Date.now()).toLocaleTimeString();
        const lvl = ev.level ? `L${ev.level}` : 'L?';
        return `<div class=\"tick\">[${t}] ${lvl} :: ${ev.msg || ''}</div>`;
      }).join('');
      ticker.scrollTop = ticker.scrollHeight;
    }

    // Radial progress per level using stroke-dashoffset
    for (let i=1;i<=4;i++) {
      const a = attempts.filter(x => x.level === i).length;
      const s = successes.filter(x => x.level === i).length;
      const pct = a ? (s / a) : 0;
      const c = qs('#rad'+i);
      if (c) {
        const r = 50; const circ = 2 * Math.PI * r;
        c.setAttribute('stroke-dasharray', String(circ));
        c.setAttribute('stroke-dashoffset', String(circ * (1 - pct)));
      }
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
    setupDecryptAccordions();
  });

})();
