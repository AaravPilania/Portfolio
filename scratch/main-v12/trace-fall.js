// HEADFUL=1 node scratch/main-v12/trace-fall.js [tag] -> a devtools timeline trace of the wheel through slide 05 into the
// footer; prints every main-thread task over 50ms with its heaviest children (layout, style, script by URL, paint, GC)
const { open, sleep } = require('./site.js');
const W = 1920, H = 1080;
(async () => {
    const { page, close, geo, set } = await open(W, H, { settle: 6000 });
    const g = await geo();
    await set(g.together.top + H * 0.2);
    await sleep(3000);
    const evs = [];
    page.on('Tracing.dataCollected', (p) => evs.push(...p.value));
    const complete = new Promise((r) => page.on('Tracing.tracingComplete', r));
    await page.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,v8.execute', transferMode: 'ReportEvents' });
    for (let b = 0; b < 6; b++) {
        for (let i = 0; i < 24; i++) {
            await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W * 0.5, y: H * 0.5, deltaX: 0, deltaY: 40 });
            await sleep(16);
        }
        await sleep(260);
    }
    await sleep(2000);
    await page.send('Tracing.end');
    await complete;
    console.log('events', evs.length, 'threads', JSON.stringify(evs.filter((e) => e.name === 'thread_name').map((e) => e.args.name).slice(0, 30)));
    const all = evs.filter((e) => e.name === 'RunTask').sort((a, b) => b.dur - a.dur);
    console.log('top RunTask ms', JSON.stringify(all.slice(0, 10).map((e) => [e.tid, Math.round(e.dur / 1000)])));
    const fa = evs.filter((e) => e.name === 'FireAnimationFrame' || e.name === 'AnimationFrame').length;
    console.log('anim frames', fa);
    const main = evs.filter((e) => e.name === 'RunTask' && e.dur > 50000);
    const tidOf = new Map();
    evs.forEach((e) => { if (e.name === 'thread_name' && e.args && e.args.name === 'CrRendererMain') tidOf.set(e.pid + ':' + e.tid, 1); });
    const tasks = main.filter((e) => tidOf.has(e.pid + ':' + e.tid));
    console.log('tasks >50ms', tasks.length);
    for (const t of tasks.slice(0, 25)) {
        const kids = evs.filter((e) => e.pid === t.pid && e.tid === t.tid && e.ts >= t.ts && e.ts + (e.dur || 0) <= t.ts + t.dur && e !== t && e.dur);
        const agg = new Map();
        kids.forEach((e) => {
            let k = e.name;
            if (e.name === 'FunctionCall' || e.name === 'EvaluateScript') k += ' ' + ((e.args && e.args.data && (e.args.data.url || '')) + '').split('/').pop() + ':' + (e.args && e.args.data && e.args.data.lineNumber);
            if (['Layout', 'UpdateLayoutTree', 'Paint', 'PrePaint', 'Layerize', 'MajorGC', 'MinorGC', 'FunctionCall', 'TimerFire', 'FireAnimationFrame', 'EventDispatch', 'HitTest', 'ScrollLayer', 'IntersectionObserverController::computeIntersections', 'UpdateLayer', 'CompositeLayers', 'RasterTask', 'Decode Image', 'GPUTask', 'ParseHTML', 'EvaluateScript', 'v8.compile', 'V8.GC_MC_BACKGROUND_MARKING'].some((n) => e.name.startsWith(n)))
                agg.set(k, (agg.get(k) || 0) + e.dur);
        });
        console.log(Math.round(t.ts / 1000), 'dur', Math.round(t.dur / 1000), JSON.stringify([...agg].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, Math.round(v / 1000)])));
    }
    await close();
    process.exit(0);
})();
