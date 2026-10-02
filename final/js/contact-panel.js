// Contact panel: live New Delhi clock and copy-email. The calendar renderer reads the panel's size for its layout.
(() => {
    'use strict';

    const IST_MS = 5.5 * 3600e3;
    const timeEl = document.getElementById('ctTime');
    const secEl = document.getElementById('ctSec');
    const moodEl = document.getElementById('ctMood');
    const copyBtn = document.getElementById('ctCopy');
    const live = document.getElementById('ctLive');
    const addr = document.querySelector('.ct__addr');
    const pad = (n) => String(n).padStart(2, '0');

    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = document.getElementById('ctMonthLabel');
    const monthGrid = document.getElementById('ctMonthGrid');
    function renderMonth(d) {
        const y = d.getUTCFullYear(), mo = d.getUTCMonth(), day = d.getUTCDate();
        const first = new Date(Date.UTC(y, mo, 1)), lead = first.getUTCDay();
        const weekStart = day - d.getUTCDay();
        const rows = Math.ceil((lead + new Date(Date.UTC(y, mo + 1, 0)).getUTCDate()) / 7);
        let html = 'SMTWTFS'.split('').map((c) => `<span class="is-dow">${c}</span>`).join('');
        for (let i = 0; i < rows * 7; i++) {
            const n = i - lead + 1, cell = new Date(Date.UTC(y, mo, n)), num = cell.getUTCDate();
            const cls = [];
            if (cell.getUTCMonth() !== mo) cls.push('is-out');
            if (n >= weekStart && n < weekStart + 7) cls.push('is-week', n === weekStart ? 'is-first' : n === weekStart + 6 ? 'is-last' : '');
            if (n === day) cls.push('is-today');
            html += `<span class="${cls.join(' ').trim()}">${n === day ? `<b>${num}</b>` : num}</span>`;
        }
        monthLabel.textContent = MONTHS[mo] + ' ' + y;
        monthGrid.innerHTML = html;
    }

    let lastMin = -1, lastDay = -1;
    function tickClock() {
        const d = new Date(Date.now() + IST_MS);
        const h = d.getUTCHours(), m = d.getUTCMinutes();
        secEl.textContent = ':' + pad(d.getUTCSeconds());
        if (m === lastMin) return;
        lastMin = m;
        if (d.getUTCDate() !== lastDay) { lastDay = d.getUTCDate(); renderMonth(d); }
        timeEl.textContent = pad(h) + ':' + pad(m);
        timeEl.dateTime = pad(h) + ':' + pad(m) + '+05:30';
        moodEl.textContent = h < 7 ? 'probably asleep' : h < 10 ? 'coffee first' : h < 23 ? 'probably awake' : 'probably shipping';
    }
    tickClock();
    setInterval(tickClock, 1000);

    async function copy(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
            document.body.appendChild(ta);
            ta.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
            ta.remove();
            return ok;
        }
    }

    let resetTimer = 0;
    copyBtn.addEventListener('click', async () => {
        const email = addr.textContent.trim();
        const ok = await copy(email);
        copyBtn.classList.toggle('is-done', ok);
        copyBtn.querySelector('.ct__copy-label').textContent = ok ? 'Copied' : 'Selected';
        live.textContent = ok ? 'Email address copied to clipboard' : 'Copy failed — select the address to copy it';
        if (!ok) getSelection().selectAllChildren(addr);
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
            copyBtn.classList.remove('is-done');
            copyBtn.querySelector('.ct__copy-label').textContent = 'Copy';
        }, 1800);
    });
})();
