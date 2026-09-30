(() => {
    const Lab = window.CursorLab;
    const core = Lab.core;
    const dock = document.querySelector('.cl-dock');
    const items = dock.querySelector('.cl-dock__items');
    const activeEl = dock.querySelector('[data-active]');
    const codeEl = dock.querySelector('[data-code]');
    const reducedBtn = dock.querySelector('[data-reduced]');
    const two = n => String(n).padStart(2, '0');

    const buttons = Lab.concepts.map(c => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cl-dock__item';
        b.dataset.cursor = 'USE';
        b.dataset.id = c.id;
        b.innerHTML = '<span class="cl-dock__num">' + two(c.index) + '</span><span class="cl-dock__name"></span><span class="cl-dock__line"></span>';
        b.querySelector('.cl-dock__name').textContent = c.name;
        b.querySelector('.cl-dock__line').textContent = c.line;
        b.addEventListener('click', () => Lab.use(c.id));
        items.append(b);
        return b;
    });

    document.addEventListener('cursorlab:change', e => {
        const c = e.detail;
        buttons.forEach(b => b.classList.toggle('is-active', b.dataset.id === c.id));
        activeEl.textContent = two(c.index) + ' — ' + c.name;
        codeEl.textContent = "CursorLab.use('" + c.id + "')";
        history.replaceState(null, '', '#' + c.id);
    });

    document.addEventListener('cursorlab:touch', () => {
        activeEl.textContent = 'Touch device — custom cursor off, native input kept';
    });

    addEventListener('keydown', e => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const n = Number(e.key);
        if (n >= 1 && n <= Lab.concepts.length) { Lab.use(n); return; }
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            const i = Lab.concepts.indexOf(Lab.active);
            const len = Lab.concepts.length;
            Lab.use(Lab.concepts[(i + (e.key === 'ArrowRight' ? 1 : len - 1)) % len]);
            e.preventDefault();
        }
    });

    reducedBtn.addEventListener('click', () => {
        core.reduced = !core.reduced;
        reducedBtn.setAttribute('aria-pressed', String(core.reduced));
        const a = Lab.active;
        if (a && core.ctx) {
            if (a.unmount) a.unmount(core);
            core.clear();
            if (a.mount) a.mount(core);
        }
    });

    document.querySelectorAll('a[href="#"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

    const card = document.querySelector('.cl-card');
    const stage = card.parentElement;
    let drag = null;
    let ox = 0, oy = 0;
    card.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        const s = stage.getBoundingClientRect();
        const c = card.getBoundingClientRect();
        drag = {
            id: e.pointerId, sx: e.clientX, sy: e.clientY, bx: ox, by: oy,
            minX: ox - (c.left - s.left), maxX: ox + (s.right - c.right),
            minY: oy - (c.top - s.top), maxY: oy + (s.bottom - c.bottom)
        };
        card.setPointerCapture(e.pointerId);
        card.classList.add('is-dragging');
    });
    card.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        const nx = Math.min(drag.maxX, Math.max(drag.minX, drag.bx + e.clientX - drag.sx));
        const ny = Math.min(drag.maxY, Math.max(drag.minY, drag.by + e.clientY - drag.sy));
        core.shift(card, nx - ox, ny - oy);
        ox = nx; oy = ny;
        card.style.transform = 'translate3d(' + ox + 'px,' + oy + 'px,0) rotate(' + ((e.movementX || 0) * 0.25).toFixed(2) + 'deg)';
    });
    const end = e => {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        card.classList.remove('is-dragging');
        card.style.transform = 'translate3d(' + ox + 'px,' + oy + 'px,0)';
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);

    const hash = location.hash.slice(1);
    const initial = Lab.concepts.find(c => c.id === hash || two(c.index) === hash) || Lab.concepts[0];
    Lab.use(initial.id);
    Lab.start();

    console.info(
        '%c[ CURSOR LAB ]%c Drop-in: load /guide/cursor-lab/core.js + concepts.js, then CursorLab.use("' + initial.id + '"); CursorLab.start({ scroller: document.querySelector(".js-scroller") }).\n' +
        'Tag hover targets with data-cursor="VIEW|OPEN|DRAG|TEXT" and surfaces with data-zone="paper|void". Each concept is { id, mount(core), unmount(core), frame(core, dt), onDown, onUp, onHover }.',
        'background:#121316;color:#FFED29;padding:2px 6px;font-family:monospace', 'color:inherit'
    );
})();
