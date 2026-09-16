const WebSocket = globalThis.WebSocket;

function createCdpClient(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  let idCounter = 1;
  ws.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    } catch(e) {}
  });
  const ready = new Promise(resolve => ws.addEventListener('open', resolve));
  return {
    async call(method, params = {}) {
      await ready;
      return new Promise((resolve, reject) => {
        const id = idCounter++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    close() { ws.close(); }
  };
}

async function inspectRouterAndPT() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const pt = window.$?.instances?.get('pageTransition');
      const router = window.$?.instances?.get('router');

      const getProps = (obj) => {
        if (!obj) return null;
        const own = Object.keys(obj);
        const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(obj));
        return { own, proto };
      };

      return {
        pt: getProps(pt),
        router: getProps(router),
        swupHooks: router?.swup?.hooks ? Object.keys(router.swup.hooks) : null,
        swupPlugins: router?.swup?.plugins?.map(p => p.name || p.constructor?.name),
        ptValues: pt ? {
          inProgress: pt.inProgress,
          outProgress: pt.outProgress,
          animating: pt.animating,
          theme: pt.theme,
          element: pt.element?.className,
          counter: pt.counter?.className,
          counterContainer: pt.counterContainer?.className
        } : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Router & PT Details:', JSON.stringify(res.result.value, null, 2));
  client.close();
}

inspectRouterAndPT().catch(console.error);
