(function () {
  if (window.__hajimiPerf) return;

  const SOURCE_PAGE = "hajimi-perf-page";
  const SOURCE_CONTENT = "hajimi-perf-content";
  let requestSeq = 0;

  function request(action) {
    const id = `${Date.now()}:${++requestSeq}`;
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        window.removeEventListener("message", onMessage);
        resolve({ ok: false, error: "Hajimi perf bridge timed out", items: [] });
      }, 3000);

      function onMessage(event) {
        if (event.source !== window) return;
        const data = event.data || {};
        if (data.source !== SOURCE_CONTENT || data.id !== id) return;
        window.clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        resolve(data.payload || { ok: false, error: "Empty perf response", items: [] });
      }

      window.addEventListener("message", onMessage);
      window.postMessage({ source: SOURCE_PAGE, id, action }, "*");
    });
  }

  window.__hajimiPerf = {
    list() {
      return request("list");
    },
    table() {
      return request("list").then((payload) => {
        const items = Array.isArray(payload?.items) ? payload.items : [];
        console.table(items);
        if (!payload?.ok && payload?.error) console.warn("[Hajimi perf]", payload.error);
        return payload;
      });
    },
    clear() {
      return request("clear").then((payload) => {
        if (!payload?.ok && payload?.error) console.warn("[Hajimi perf]", payload.error);
        return payload;
      });
    }
  };
})();
