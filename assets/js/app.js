(() => {
  const C = window.CONFIG, T = window.I18N;
  const SUP = ["fr", "de", "en"];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let lang = "en", country = "";

  const t = (k, vars) => {
    let v = (T[lang] && T[lang][k]) ?? T.en[k] ?? k;
    if (typeof v === "string" && vars) for (const [a, b] of Object.entries(vars)) v = v.replaceAll(`{${a}}`, b);
    return v;
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };

  /* ───────── language ───────── */
  function browserLang() {
    for (const l of navigator.languages || [navigator.language || ""]) {
      const c = l.slice(0, 2).toLowerCase();
      if (SUP.includes(c)) return c;
    }
    return null;
  }
  function langForCountry(cc, br) {
    const pick = (opts, def) => (opts.includes(br) ? br : def);
    switch (cc) {
      case "DE": case "AT": case "LI": return "de";
      case "FR": case "MC": return "fr";
      case "BE": return pick(["fr", "de"], "fr");
      case "CH": return pick(["de", "fr"], "de");
      case "LU": return pick(["fr", "de"], "fr");
      default:   return br || "en";
    }
  }
  async function detectCountry() {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 2500);
    try {
      const r = await fetch("https://get.geojs.io/v1/ip/country.json", { signal: ctl.signal });
      const j = await r.json();
      return (j.country || "").toUpperCase();
    } catch { return ""; } finally { clearTimeout(timer); }
  }
  function setLang(l, remember) {
    lang = SUP.includes(l) ? l : "en";
    if (remember) store.set("lang", lang);
    document.documentElement.lang = lang;
    $$("[data-lang]").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === lang));
    render();
  }

  /* ───────── text rendering ───────── */
  function render() {
    $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    $$("[data-i18n-list]").forEach(el => {
      el.innerHTML = "";
      (t(el.dataset.i18nList) || []).forEach(x => { const li = document.createElement("li"); li.textContent = x; el.append(li); });
    });
    $("#hotelName").textContent = C.places.hotel.name;
    renderCagnotte();
    renderDay();
    renderMulti("allergies"); renderMulti("diet");
    renderCompanions(); renderSongs();
    $$(".credit").forEach(el => { el.textContent = t("stay.photo") + el.dataset.src; });
  }

  /* ───────── the day, drawn as the light of 27 March ─────────
     Real minutes since 00:00 on the 27th. Clocks jump 02:00 → 03:00 (CET → CEST). */
  const START = 15 * 60 + 45, KNEE = 21 * 60, END = 27 * 60 + 30 - 60; // 03:30 wall = 02:30 real
  const pos = m => m <= KNEE ? (m - START) / (KNEE - START) * 0.72
                             : 0.72 + (m - KNEE) / (END - KNEE) * 0.28;
  const SKY = [ // real time → sky colour over the Bliesgau
    [945, "#cddfe8"], [1050, "#dde6df"], [1095, "#efdcb6"], [1134, "#eba98b"],
    [1155, "#b89cb0"], [1180, "#6f7e9f"], [1215, "#38435d"], [1290, "#1f2739"], [END, "#141a26"]
  ];
  const fmt = (m) => {
    const wall = m >= 26 * 60 ? m + 60 : m; // after the jump
    const h = Math.floor(wall / 60) % 24, mi = wall % 60;
    if (lang === "fr") return `${h}h${String(mi).padStart(2, "0")}`;
    return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
  };
  // img: taped polaroid (assets/img/day/), stk: stickers (assets/img/stickers/), r: tilt in degrees
  const EVENTS = [
    { m: 960,  k: "ev.arrive", side: "up",   img: "arrive",   stk: ["envelope"],             r: -4, tape: "top" },
    { m: 990,  k: "ev.ceremony", side: "down", img: "ceremony", stk: ["rings"],              r: 3,  tape: "corners" },
    { m: 1050, end: 1140, k: "ev.photos", note: "ev.photosNote", side: "up", img: "photos", stk: ["camera", "champagne"], r: -2, tape: "corners" },
    { m: 1140, k: "ev.buffet", side: "down", img: "buffet",   stk: ["plate"],                r: 4,  tape: "top" },
    { m: 1200, k: "ev.cake", side: "up",     img: "cake",     stk: ["cake"],                 r: -3, tape: "top" },
    { m: 1230, k: "ev.party", side: "down", open: true, img: "party", stk: ["disco"],        r: 2,  tape: "corners" }
  ];
  const snap = e => {
    if (!e.img) return "";
    const tapes = e.tape === "corners" ? `<i class="tape tl"></i><i class="tape tr"></i>` : `<i class="tape tc"></i>`;
    const stickers = (e.stk || []).map((s, i) => `<img class="sticker s${i}" src="assets/img/stickers/${s}.svg" alt="" aria-hidden="true">`).join("");
    return `<figure class="snap" style="--r:${e.r}deg"><img src="assets/img/day/${e.img}.jpg" alt="" loading="lazy">${tapes}${stickers}</figure>`;
  };
  function renderDay() {
    const band = $("#band"), evs = $("#evs");
    const stops = SKY.map(([m, c]) => `${c} ${(pos(m) * 100).toFixed(2)}%`).join(", ");
    band.style.setProperty("--stops", stops);
    band.innerHTML = "";
    // hour ticks
    for (let m = 16 * 60; m <= END; m += 60) {
      if (m === 26 * 60) continue; // drawn as the jump
      const tk = document.createElement("span");
      tk.className = "tick" + (m >= 1170 ? " night" : "");
      tk.style.setProperty("--p", pos(m));
      tk.textContent = fmt(m).replace(/[:h]00$/, lang === "fr" ? "h" : "");
      band.append(tk);
    }
    const sun = document.createElement("span");
    sun.className = "sunset"; sun.style.setProperty("--p", pos(1134));
    sun.innerHTML = `<i></i><b>${fmt(1134)} ${t("ev.sunset")}</b>`;
    band.append(sun);
    const jump = document.createElement("span");
    jump.className = "jump"; jump.style.setProperty("--p", pos(26 * 60));
    jump.innerHTML = `<i></i><b>${t("ev.clock")}</b>`;
    band.append(jump);
    for (const [name, m] of [["sun", 1134], ["moon", 23 * 60 + 15]]) {
      const s = document.createElement("img");
      s.className = `sticker band-${name}`; s.src = `assets/img/stickers/${name}.svg`; s.alt = ""; s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--p", pos(m));
      band.append(s);
    }

    evs.innerHTML = "";
    for (const e of EVENTS) {
      const li = document.createElement("li");
      li.className = `ev ${e.side}` + (e.end ? " range" : "") + (e.open ? " open" : "");
      li.style.setProperty("--p", pos(e.m));
      li.style.setProperty("--i", EVENTS.indexOf(e));
      if (e.end) {
        const bar = document.createElement("span");
        bar.className = "rangebar";
        bar.style.setProperty("--p", pos(e.m)); bar.style.setProperty("--w", pos(e.end) - pos(e.m));
        band.append(bar);
      }
      li.innerHTML = `<div class="txt"><time>${fmt(e.m)}${e.end ? "–" + fmt(e.end) : ""}</time><span class="what"></span>` +
                     (e.note ? `<span class="note"></span>` : "") + `</div>` + snap(e);
      $(".what", li).textContent = t(e.k);
      if (e.note) $(".note", li).textContent = t(e.note);
      evs.append(li);
    }
  }

  /* ───────── places: photos from the official sites ───────── */
  function mountPhotos(id, place) {
    const box = $("#" + id);
    if (!box) return;
    place.images.forEach((src, i) => {
      const img = new Image();
      img.loading = "lazy"; img.alt = ""; img.referrerPolicy = "no-referrer";
      img.src = src;
      img.onerror = () => { img.remove(); if (!box.querySelector("img")) box.classList.add("empty"); };
      if (i > 0) img.className = "second";
      box.append(img);
    });
    const cr = document.createElement("a");
    cr.className = "credit"; cr.href = place.url; cr.target = "_blank"; cr.rel = "noopener";
    cr.dataset.src = place.credit;
    box.append(cr);
  }

  /* ───────── cagnotte ───────── */
  function renderCagnotte() {
    const b = $("#cagnotteBtn");
    if (C.cagnotteUrl) { b.href = C.cagnotteUrl; b.hidden = false; b.textContent = t("gift.cta"); }
    else { b.removeAttribute("href"); b.classList.add("soon"); b.textContent = t("gift.soon"); }
    if (C.iban) {
      $("#ibanBox").hidden = false;
      $("#ibanHolder").textContent = C.ibanHolder;
      $("#ibanValue").textContent = C.iban;
    }
  }

  /* ───────── form: multi-select dropdowns ───────── */
  const chosen = { allergies: new Set(), diet: new Set() };
  function renderMulti(name) {
    const box = $("#" + name), opts = t("opt." + name), en = T.en["opt." + name];
    const open = box.classList.contains("open");
    box.innerHTML = "";
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "multi-btn";
    btn.setAttribute("aria-expanded", open);
    const sel = [...chosen[name]];
    btn.textContent = sel.length === 0 ? t("f.none")
      : sel.length <= 2 ? sel.map(k => opts[k]).join(", ") : t("f.selected", { n: sel.length });
    btn.onclick = () => { box.classList.toggle("open"); btn.setAttribute("aria-expanded", box.classList.contains("open")); };
    const panel = document.createElement("div");
    panel.className = "multi-panel";
    for (const [k, label] of Object.entries(opts)) {
      const l = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.value = en[k]; cb.checked = chosen[name].has(k);
      cb.onchange = () => {
        cb.checked ? chosen[name].add(k) : chosen[name].delete(k);
        const other = box.parentElement.querySelector(".other");
        other.hidden = !chosen[name].has("other");
        if (!other.hidden && cb.value === en.other && cb.checked) other.focus();
        renderMulti(name);
      };
      l.append(cb, " ", label);
      panel.append(l);
    }
    box.append(btn, panel);
  }
  document.addEventListener("click", e => {
    $$(".multi.open").forEach(m => { if (!m.contains(e.target)) { m.classList.remove("open"); $(".multi-btn", m)?.setAttribute("aria-expanded", "false"); } });
  });

  /* ───────── form: companions ───────── */
  let companions = [];
  function renderCompanions() {
    $("#count").textContent = companions.length;
    const box = $("#companions");
    box.innerHTML = "";
    companions.forEach((c, i) => {
      const row = document.createElement("div");
      row.className = "comp";
      const name = document.createElement("input");
      name.maxLength = 120; name.value = c.name;
      name.placeholder = t("f.companionName", { i: i + 1 });
      name.oninput = () => { c.name = name.value; };
      const lab = document.createElement("label");
      const ch = document.createElement("input");
      ch.type = "checkbox"; ch.checked = c.child;
      ch.onchange = () => { c.child = ch.checked; };
      lab.append(ch, " ", t("f.child"));
      row.append(name, lab);
      box.append(row);
    });
  }
  $("#plus").onclick = () => { if (companions.length < 12) { companions.push({ name: "", child: false }); renderCompanions(); $("#companions .comp:last-child input")?.focus(); } };
  $("#minus").onclick = () => { companions.pop(); renderCompanions(); };

  /* ───────── form: songs ───────── */
  // Each song field searches the free iTunes Search API (no key, CORS-enabled).
  let songs = [{ text: "", art: "" }];
  const audio = new Audio();
  let playingBtn = null;
  function stopPreview() {
    audio.pause();
    if (playingBtn) { playingBtn.textContent = "▶"; playingBtn.classList.remove("on"); }
    playingBtn = null;
  }
  function togglePreview(url, btn) {
    if (playingBtn === btn) return stopPreview();
    stopPreview();
    audio.src = url; audio.play().catch(() => {});
    playingBtn = btn; btn.textContent = "❚❚"; btn.classList.add("on");
    audio.onended = stopPreview;
  }
  function songField(s) {
    const wrap = document.createElement("div");
    wrap.className = "song" + (s.art ? " has-art" : "");
    const art = new Image(); art.className = "song-art"; art.alt = "";
    if (s.art) art.src = s.art;
    const inp = document.createElement("input");
    inp.maxLength = 150; inp.value = s.text; inp.placeholder = t("f.songPh"); inp.autocomplete = "off";
    inp.setAttribute("role", "combobox"); inp.setAttribute("aria-autocomplete", "list"); inp.setAttribute("aria-expanded", "false");
    const list = document.createElement("ul");
    list.className = "song-list"; list.hidden = true; list.setAttribute("role", "listbox");
    wrap.append(art, inp, list);

    let timer, results = [], active = -1, seq = 0;
    const close = () => { list.hidden = true; inp.setAttribute("aria-expanded", "false"); };
    const pick = r => {
      s.text = `${r.trackName} — ${r.artistName}`; s.art = r.artworkUrl60 || "";
      inp.value = s.text; art.src = s.art; wrap.classList.toggle("has-art", !!s.art);
      close(); stopPreview();
    };
    function draw() {
      list.innerHTML = "";
      if (!results.length) return close();
      results.forEach((r, i) => {
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        if (i === active) li.className = "active";
        li.innerHTML = `<img alt="" src="${r.artworkUrl60 || ""}"><span class="t"></span><span class="a"></span>` +
                       (r.previewUrl ? `<button type="button" class="play" aria-label="preview">▶</button>` : "");
        $(".t", li).textContent = r.trackName;
        $(".a", li).textContent = r.artistName;
        li.addEventListener("mousedown", e => e.preventDefault()); // keep focus in the input
        li.onclick = () => pick(r);
        const pb = $(".play", li);
        if (pb) pb.onclick = e => { e.stopPropagation(); togglePreview(r.previewUrl, pb); };
        list.append(li);
      });
      const src = document.createElement("li");
      src.className = "src"; src.textContent = "Apple Music";
      list.append(src);
      list.hidden = false; inp.setAttribute("aria-expanded", "true");
    }
    async function search(q) {
      const my = ++seq;
      const cc = ["FR", "DE", "BE", "CH", "LU", "AT"].includes(country) ? country : "FR";
      try {
        const r = await fetch(`https://itunes.apple.com/search?media=music&entity=song&limit=6&country=${cc}&term=${encodeURIComponent(q)}`);
        const j = await r.json();
        if (my !== seq) return; // a newer search is on its way
        results = j.results || []; active = -1; draw();
      } catch { close(); }
    }
    inp.oninput = () => {
      s.text = inp.value; s.art = ""; wrap.classList.remove("has-art");
      clearTimeout(timer);
      const q = inp.value.trim();
      if (q.length < 2) { seq++; return close(); }
      timer = setTimeout(() => search(q), 320);
    };
    inp.onkeydown = e => {
      if (list.hidden) return;
      if (e.key === "ArrowDown") { active = Math.min(active + 1, results.length - 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { active = Math.max(active - 1, 0); draw(); e.preventDefault(); }
      else if (e.key === "Enter" && active >= 0) { pick(results[active]); e.preventDefault(); }
      else if (e.key === "Escape") close();
    };
    inp.onblur = () => setTimeout(close, 200);
    return wrap;
  }
  function renderSongs() {
    const box = $("#songs");
    box.innerHTML = "";
    songs.forEach(s => box.append(songField(s)));
    $("#addSong").hidden = songs.length >= 8;
  }
  $("#addSong").onclick = () => { songs.push({ text: "", art: "" }); renderSongs(); $("#songs .song:last-child input").focus(); };

  /* ───────── form: attending toggle ───────── */
  const form = $("#form");
  form.addEventListener("change", e => {
    if (e.target.name === "attending") form.classList.toggle("is-no", e.target.value === "No");
  });

  /* ───────── submit ───────── */
  function showError(msg) { const el = $("#error"); el.textContent = msg; el.hidden = !msg; if (msg) el.scrollIntoView({ block: "center", behavior: "smooth" }); }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    showError("");
    const fd = new FormData(form);
    if (fd.get("website")) return; // bot
    const attending = fd.get("attending");
    const missing = [];
    if (!attending) missing.push(t("f.coming").replace(/[?？]\s*$/, ""));
    for (const [k, lk] of [["name", "f.name"], ["email", "f.email"], ["phone", "f.phone"]])
      if (!String(fd.get(k) || "").trim()) missing.push(t(lk));
    if (missing.length) return showError(t("f.errRequired", { fields: missing.join(", ") }));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(fd.get("email")).trim())) return showError(t("f.errEmail"));
    if (!C.scriptUrl) return showError(t("f.errSetup"));

    const yes = attending === "Yes";
    const enA = T.en["opt.allergies"], enD = T.en["opt.diet"];
    const comps = yes ? companions : [];
    const payload = {
      attending,
      name: fd.get("name").trim(),
      email: fd.get("email").trim().toLowerCase(),
      phone: fd.get("phone").trim(),
      companions: comps.length,
      companionNames: comps.map((c, i) => (c.name.trim() || `#${i + 1}`) + (c.child ? " (child)" : "")).join("; "),
      children: comps.filter(c => c.child).length,
      total: yes ? 1 + comps.length : 0,
      allergies: yes ? [...chosen.allergies].filter(k => k !== "other").map(k => enA[k]).join(", ") : "",
      allergiesOther: yes && chosen.allergies.has("other") ? (fd.get("allergiesOther") || "").trim() : "",
      diet: yes ? [...chosen.diet].filter(k => k !== "other").map(k => enD[k]).join(", ") : "",
      dietOther: yes && chosen.diet.has("other") ? (fd.get("dietOther") || "").trim() : "",
      kitchen: yes ? (fd.get("kitchen") || "").trim() : "",
      music: yes ? songs.map(s => s.text.trim()).filter(Boolean).join("\n") : "",
      message: (fd.get("message") || "").trim(),
      lang, country
    };

    const btn = $("#submit");
    btn.disabled = true; btn.textContent = t("f.sending");
    try {
      const body = JSON.stringify(payload);
      let ok = false;
      try {
        const r = await fetch(C.scriptUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body });
        const j = await r.json();
        ok = !!j.ok;
      } catch {
        // Some browsers block reading the Apps Script redirect; send blind. The sheet de-duplicates by email.
        await fetch(C.scriptUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body });
        ok = true;
      }
      if (!ok) throw new Error("not ok");
      store.set("rsvp", JSON.stringify({ name: payload.name, attending, total: payload.total }));
      showThanks(payload.name.split(" ")[0], yes, payload.total);
    } catch {
      showError(t("f.errSend"));
    } finally {
      btn.disabled = false; btn.textContent = t("f.send");
    }
  });

  function showThanks(first, yes, n) {
    form.hidden = true;
    $("#already").hidden = true;
    $("#thanks").hidden = false;
    $("#thanksTitle").textContent = t(yes ? "rsvp.thanksYes" : "rsvp.thanksNo", { name: first });
    $("#thanksBody").textContent = yes ? t(n > 1 ? "rsvp.thanksYesBody" : "rsvp.thanksYesBody1", { n }) : t("rsvp.thanksNoBody");
    if (yes) leaves();
    $("#rsvp").scrollIntoView({ behavior: "smooth" });
  }
  $("#again").onclick = () => { $("#thanks").hidden = true; form.hidden = false; };

  /* ───────── misc ───────── */
  $("#lnkGlamping").href = C.places.glamping.book || C.places.glamping.url;
  $("#lnkHotel").href = C.places.hotel.book || C.places.hotel.url;
  mountPhotos("imgGlamping", C.places.glamping);
  mountPhotos("imgHotel", C.places.hotel);
  $("#ibanCopy").onclick = async () => {
    try { await navigator.clipboard.writeText(C.iban.replace(/\s/g, "")); $("#ibanCopy").textContent = t("gift.copied"); } catch {}
  };
  $$("[data-lang]").forEach(b => b.onclick = () => setLang(b.dataset.lang, true));
  if (store.get("rsvp")) $("#already").hidden = false;

  /* ───────── countdown to 27.03.2027 16:00 (CET = UTC+1) ───────── */
  const WEDDING = Date.UTC(2027, 2, 27, 15, 0, 0);
  function tick() {
    const ms = WEDDING - Date.now();
    const box = $("#countdown");
    if (ms <= 0) { box.hidden = true; return; }
    const s = Math.floor(ms / 1000);
    $("#cdD").textContent = Math.floor(s / 86400);
    $("#cdH").textContent = String(Math.floor(s / 3600) % 24).padStart(2, "0");
    $("#cdM").textContent = String(Math.floor(s / 60) % 60).padStart(2, "0");
    $("#cdS").textContent = String(s % 60).padStart(2, "0");
  }
  tick(); setInterval(tick, 1000);

  /* ───────── reveal on scroll ───────── */
  const revealSel = "section > h2, .lede, .deadline, .where-grid, .place, .gift > p, .gift .btn, #form, .day .track";
  $$(revealSel).forEach(el => el.classList.add("reveal"));
  const io = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }) : null;
  $$(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("in"));

  /* ───────── header: transparent over the hero, solid once scrolled ───────── */
  const topBar = $(".top");
  const onScroll = () => topBar.classList.toggle("scrolled", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ───────── falling leaves after a yes ───────── */
  function leaves() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "leaf-rain"; layer.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 26; i++) {
      const img = new Image();
      img.src = i % 2 ? "assets/img/leaf-r.png" : "assets/img/leaf-l.png";
      img.style.left = Math.random() * 100 + "vw";
      img.style.width = 22 + Math.random() * 34 + "px";
      img.style.animationDuration = 4 + Math.random() * 3.5 + "s";
      img.style.animationDelay = Math.random() * 1.6 + "s";
      img.style.setProperty("--drift", (Math.random() * 160 - 80) + "px");
      img.style.setProperty("--spin", (Math.random() * 540 - 270) + "deg");
      layer.append(img);
    }
    document.body.append(layer);
    setTimeout(() => layer.remove(), 9500);
  }

  /* ───────── boot ───────── */
  const urlLang = new URLSearchParams(location.search).get("lang");
  const saved = store.get("lang");
  const br = browserLang();
  setLang(SUP.includes(urlLang) ? urlLang : saved || br || "en", SUP.includes(urlLang));
  detectCountry().then(cc => {
    country = cc;
    if (!cc || SUP.includes(urlLang) || saved) return;
    const l = langForCountry(cc, br);
    if (l !== lang) setLang(l, false);
  });
})();
