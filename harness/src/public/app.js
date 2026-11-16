/* Office Collab Lab — evaluation UI */

const state = {
  engines: [],
  documents: [],
  users: [],
  selectedEngine: null,
  selectedDoc: null,
  user: null,
  ooApiLoadedFor: null,
  docEditor: null,
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.headers || {}),
    },
    ...options,
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function $(id) {
  return document.getElementById(id);
}

function renderEngines() {
  const root = $("engine-list");
  root.innerHTML = "";
  for (const eng of state.engines) {
    const el = document.createElement("div");
    el.className = "card" + (state.selectedEngine?.id === eng.id ? " active" : "");
    const ready = eng.ready === true;
    el.innerHTML = `<h3>${eng.label}</h3>
      <p class="sub">${eng.integration}</p>
      <p class="sub"><span class="status-dot ${ready ? "up" : "down"}" data-engine="${eng.id}"></span>${ready ? "ready" : "not ready"} — ${escapeHtml(eng.status || eng.publicUrl)}</p>`;
    el.onclick = () => {
      state.selectedEngine = eng;
      $("link-example").href = eng.example || eng.publicUrl;
      $("link-example").textContent = eng.example ? "Vendor example" : "Engine URL";
      renderEngines();
      updateOpenButton();
    };
    root.appendChild(el);
  }
}

function renderDocs() {
  const root = $("doc-list");
  root.innerHTML = "";
  if (!state.documents.length) {
    root.innerHTML = `<p class="sub">No documents. Upload or seed corpus.</p>`;
    return;
  }
  for (const doc of state.documents) {
    const el = document.createElement("div");
    el.className = "card" + (state.selectedDoc?.id === doc.id ? " active" : "");
    el.innerHTML = `<h3>${escapeHtml(doc.title)}</h3>
      <p class="sub">${doc.fileType} · rev ${doc.revision} · ${formatBytes(doc.size)}</p>
      <p class="sub">${doc.hash?.slice(0, 12)}… · ${doc.tenantId}</p>`;
    el.onclick = () => {
      state.selectedDoc = doc;
      renderDocs();
      updateOpenButton();
    };
    root.appendChild(el);
  }
}

function renderUsers() {
  const sel = $("user-select");
  sel.innerHTML = "";
  for (const u of state.users) {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = `${u.name} (${u.id})`;
    if (state.user?.id === u.id) opt.selected = true;
    sel.appendChild(opt);
  }
}

function renderEvidence(events) {
  const root = $("evidence-list");
  root.innerHTML = "";
  for (const ev of events) {
    const el = document.createElement("div");
    el.className = "event";
    const { type, at, ...rest } = ev;
    el.innerHTML = `<div class="type">${escapeHtml(type || "?")}</div>
      <div>${escapeHtml(at || "")}</div>
      <div>${escapeHtml(JSON.stringify(rest))}</div>`;
    root.appendChild(el);
  }
}

function updateOpenButton() {
  $("btn-open").disabled = !(state.selectedEngine && state.selectedDoc);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function loadAll() {
  const [engines, docs, me, users] = await Promise.all([
    api("/api/engines"),
    api("/api/documents"),
    api("/api/auth/me"),
    api("/api/users"),
  ]);
  state.engines = engines.engines;
  state.documents = docs.documents;
  state.user = me.user;
  state.users = users.users;
  if (!state.selectedEngine && state.engines[0]) state.selectedEngine = state.engines[0];
  renderEngines();
  renderDocs();
  renderUsers();
  updateOpenButton();
  if (state.selectedEngine) {
    $("link-example").href = state.selectedEngine.example || state.selectedEngine.publicUrl;
  }
  await loadEvidence();
  probeEngines();
}

async function loadEvidence() {
  const data = await api("/api/evidence/recent?limit=80");
  renderEvidence(data.events || []);
}

async function probeEngines() {
  // Server-side probe is authoritative (api.js can be up while DocService is dead)
}

function clearEditor() {
  if (state.docEditor && typeof state.docEditor.destroyEditor === "function") {
    try {
      state.docEditor.destroyEditor();
    } catch (_) {}
  }
  state.docEditor = null;
  const host = $("editor-host");
  host.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.id = "empty-state";
  empty.innerHTML =
    "Select an engine and a document, then open a session.<br />Persistence is owned by this harness — not the vendor demo.";
  host.appendChild(empty);
  $("session-badge").textContent = "no session";
  $("session-badge").className = "badge";
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-lab-api="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.labApi = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function openSession() {
  clearEditor();
  const accessMode = $("mode-select").value;
  const data = await api("/api/sessions", {
    method: "POST",
    body: {
      editor: state.selectedEngine.id,
      documentId: state.selectedDoc.id,
      accessMode,
    },
  });
  const session = data.session;
  $("session-badge").textContent = `${session.editor} · ${session.accessMode} · rev ${session.document.revision}`;
  $("session-badge").className = `badge ${session.accessMode}`;

  const host = $("editor-host");
  host.innerHTML = "";

  if (session.editor === "collabora") {
    const iframe = document.createElement("iframe");
    iframe.src = session.editorUrl;
    iframe.allow = "clipboard-read; clipboard-write";
    iframe.title = "Collabora editor";
    host.appendChild(iframe);

    window.addEventListener("message", function onMsg(ev) {
      // Only accept messages from the Collabora origin in a real deployment.
      // Lab note: PostMessageOrigin is set server-side to browserUrl.
      if (typeof ev.data === "string" && ev.data.includes("Host_PostmessageReady")) {
        iframe.contentWindow.postMessage('{"MessageId":"Host_PostmessageReady"}', "*");
      }
    });
  } else {
    await loadScript(session.apiScriptUrl);
    if (typeof DocsAPI === "undefined" || !DocsAPI.DocEditor) {
      throw new Error("DocsAPI failed to initialize — is the engine container running?");
    }
    const editorId = `oo-editor-${Date.now()}`;
    const placeholder = document.createElement("div");
    placeholder.id = editorId;
    placeholder.style.cssText = "width:100%;height:100%;min-height:520px;";
    host.appendChild(placeholder);

    const cfg = {
      ...session.config,
      width: "100%",
      height: "100%",
      type: "desktop",
      events: {
        onAppReady() {
          console.log("editor app ready");
        },
        onDocumentReady() {
          console.log("document ready");
          $("session-badge").textContent += " · ready";
        },
        onDocumentStateChange(event) {
          console.log("document state", event);
        },
        onError(event) {
          console.error("editor error", event);
          const code = event?.data?.errorCode ?? event?.data;
          const msg =
            typeof event?.data === "object"
              ? JSON.stringify(event.data)
              : String(event?.data ?? event);
          alert(`Editor error (${code}): ${msg}`);
        },
        onWarning(event) {
          console.warn("editor warning", event);
        },
      },
    };
    console.log("launching DocsAPI", {
      editor: session.editor,
      fileType: cfg.document?.fileType,
      documentType: cfg.documentType,
      key: cfg.document?.key,
      url: cfg.document?.url,
    });
    state.docEditor = new DocsAPI.DocEditor(editorId, cfg);
  }

  await loadEvidence();
}

$("btn-refresh").onclick = () => loadAll().catch(showError);
$("btn-evidence").onclick = () => loadEvidence().catch(showError);
$("btn-close").onclick = () => clearEditor();
$("btn-open").onclick = () => openSession().catch(showError);

$("btn-upload").onclick = async () => {
  const file = $("file-input").files?.[0];
  if (!file) return alert("Choose a file first");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("title", file.name);
  await api("/api/documents", { method: "POST", body: fd });
  $("file-input").value = "";
  await loadAll();
};

$("btn-seed").onclick = async () => {
  await api("/api/documents/reset", { method: "POST", body: {} });
  await loadAll();
};

$("user-select").onchange = async (e) => {
  await api("/api/auth/login", { method: "POST", body: { userId: e.target.value } });
  await loadAll();
};

function showError(err) {
  console.error(err);
  alert(err.message || String(err));
}

loadAll().catch(showError);
setInterval(() => loadEvidence().catch(() => {}), 5000);
