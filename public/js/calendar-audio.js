// Looping soundtrack + master clock for the calendar page. Kept apart from the renderer so a site-wide sound toggle can
// drive it later through setMuted() without touching the animation.
//   CalendarAudio.init(url, loopSeconds) -> Promise (resolves once decoded)
//   CalendarAudio.time()      -> seconds since the loop started (audio-hardware clock), or null while silent
//   CalendarAudio.onStart(fn) -> fn() whenever playback (re)starts, so visuals can restart in sync
//   CalendarAudio.setMuted(b) / isRunning()
window.CalendarAudio = (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    let ctx = null, gain = null, buffer = null, source = null, startAt = 0, loop = 0, muted = false;
    const starters = new Set();
    const unlockEvents = ['pointerdown', 'touchend', 'keydown', 'click', 'wheel'];

    function play() {
        if (!buffer || source || ctx.state !== 'running') return;
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = loop;
        source.connect(gain);
        // Scheduled slightly ahead so the first sample and the visual clock's zero coincide
        startAt = ctx.currentTime + 0.05;
        source.start(startAt);
        unlockEvents.forEach((e) => window.removeEventListener(e, unlock, true));
        starters.forEach((fn) => fn());
    }

    function unlock() {
        if (!ctx) return;
        // wheel is not a user activation in most browsers: resume() stays pending and the next real gesture retries
        const p = ctx.resume();
        if (p && p.then) p.then(play, () => {});
        else play();
    }

    async function init(url, loopSeconds) {
        if (!AC) return;
        ctx = new AC({ latencyHint: 'interactive' });
        gain = ctx.createGain();
        gain.gain.value = muted ? 0 : 1;
        gain.connect(ctx.destination);
        ctx.addEventListener('statechange', play);
        unlockEvents.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
        const data = await (await fetch(url)).arrayBuffer();
        buffer = await new Promise((res, rej) => ctx.decodeAudioData(data, res, rej));
        loop = Math.min(loopSeconds, buffer.duration);
        if (ctx.state === 'running') play();
        else unlock();
    }

    return {
        init,
        time: () => (source ? ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0) - startAt : null),
        loopLength: () => loop,
        isRunning: () => !!source,
        isBlocked: () => !!ctx && !source,
        onStart: (fn) => { starters.add(fn); },
        setMuted(b) {
            muted = !!b;
            if (gain) gain.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.03);
        },
    };
})();
