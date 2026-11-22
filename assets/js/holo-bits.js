// Holographic foil touches, using the holospot kit (MIT, github.com/dmitrykurash/holospot).
//  1. a gold-foil wedding ring turning above the gift section
//  2. a foil-stamped keepsake card (the invitation's own lettering) shown after a guest says yes
// The kit and three.js are heavy, so they are fetched only when one of these is about to be seen.
// Without WebGL 2 nothing happens and the page keeps its plain leaf.

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasGL2 = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } })();
let libs = null;
const load = () => (libs ??= Promise.all([import("three"), import("holospot")]));

/* run a render loop only while the element is on screen */
function whileVisible(el, tick) {
  let on = false, raf = 0;
  const loop = (t) => { tick(t); raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !on) { on = true; raf = requestAnimationFrame(loop); }
    else if (!e.isIntersecting && on) { on = false; cancelAnimationFrame(raf); }
  }, { rootMargin: "120px" }).observe(el);
}

/* pointer → small tilt, eased */
function tilter(el, maxDeg) {
  const target = { x: 0, y: 0 }, now = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    target.y = Math.max(-1, Math.min(1, (e.clientX - cx) / (innerWidth / 2))) * maxDeg;
    target.x = Math.max(-1, Math.min(1, (e.clientY - cy) / (innerHeight / 2))) * maxDeg;
  }, { passive: true });
  return () => { now.x += (target.x - now.x) * 0.08; now.y += (target.y - now.y) * 0.08; return now; };
}

function sizer(renderer, camera, box) {
  const fit = () => {
    const r = box.getBoundingClientRect();
    if (!r.width) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(fit).observe(box);
  fit();
  return fit;
}

/* ───────── 1. the ring ───────── */
async function ring(box) {
  const [THREE, { Holo }] = await load();
  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  box.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 7.6);
  sizer(renderer, camera, box);

  const mesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.22, 64, 220), new THREE.MeshStandardMaterial());
  scene.add(mesh);
  const holo = new Holo(renderer, { quality: "low" });
  const obj = holo.apply(mesh, {
    material: "vortex", sizeMm: 70,
    settings: { "scene.background": "white", "dof.on": false, "vortex.bands": 36, "vortex.depth": 100 },
  });
  const tilt = tilter(box, 18);
  await obj.ready;
  box.classList.add("live");
  whileVisible(box, (t) => {
    const p = tilt();
    const spin = reduce ? 0.6 : t / 3200;
    mesh.rotation.set(1.05 + THREE.MathUtils.degToRad(p.x), spin + THREE.MathUtils.degToRad(p.y), 0.25);
    holo.render(scene, camera);
  });
}

/* ───────── 2. the keepsake card ───────── */
// text → transparent PNG, set in the site's own display font, for the foil die
async function textPNG(text, px = 140) {
  try { await document.fonts.load(`${px}px Forum`); } catch {}
  const c = document.createElement("canvas"), g = c.getContext("2d");
  g.font = `${px}px Forum, Georgia, serif`;
  const w = Math.ceil(g.measureText(text).width) + px * 0.4, h = Math.ceil(px * 1.35);
  c.width = w; c.height = h;
  g.font = `${px}px Forum, Georgia, serif`;
  g.fillStyle = "#000"; g.textBaseline = "middle"; g.textAlign = "center";
  g.lineWidth = px * 0.07; g.lineJoin = "round"; g.strokeStyle = "#000";
  g.strokeText(text, w / 2, h / 2);   // a bolder die than the thin web font
  g.fillText(text, w / 2, h / 2);
  return { url: c.toDataURL("image/png"), aspect: w / h };
}

async function cardDoc(guest) {
  const date = await textPNG("27 · 03 · 2027");
  const name = await textPNG(guest || "♥");
  const names = new URL("assets/img/names-foil.png", location.href).href;
  const nameW = Math.min(46, 7.5 * name.aspect);
  return { v: 1, e: [
    { i: "e1", t: "f", n: "Leaf",  p: { logo: "/logos/leaf.svg", x: 31.5, y: 75, width: 9, height: 320, foil: "gold", rotation: -18 } },
    { i: "e2", t: "f", n: "Names", p: { logo: names, x: 31.5, y: 52, width: 54, height: 420, foil: "rainbow", grooveAngle: 135, gloss: 0.9 } },
    { i: "e3", t: "f", n: "Date",  p: { logo: date.url, x: 31.5, y: 33, width: Math.min(38, 6.5 * date.aspect), height: 320, foil: "gold" } },
    { i: "e4", t: "f", n: "Guest", p: { logo: name.url, x: 31.5, y: 16, width: nameW, height: 320, foil: "gold" } },
  ] };
}

let keep = null;   // the card, once built
async function keepsake(guest) {
  const box = document.getElementById("keepsake");
  if (!box || !hasGL2) return;
  box.hidden = false;
  if (keep) { keep.obj.set({ "emboss.doc": JSON.stringify(await cardDoc(guest)) }); return; }
  keep = {};
  const [THREE, { Holo, shotCamera, shotRotation }] = await load();
  const stageEl = box.querySelector(".keepsake-stage");
  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  stageEl.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const holo = new Holo(renderer, { background: "white" });
  const card = holo.card({
    material: "emboss", look: "plain",
    settings: { "emboss.doc": JSON.stringify(await cardDoc(guest)), "emboss.stock": "cotton", "emboss.paperColour": "#fbfaf5", "emboss.thickness": 0.8, "emboss.textureStrength": 0.45 },
  });
  scene.add(card);
  holo.setScene({ "grain.on": false });
  const obj = keep.obj = holo.get(card);
  await obj.ready;
  const frame = () => {
    const r = stageEl.getBoundingClientRect();
    if (!r.width) return;
    renderer.setSize(r.width, r.height, false);
    shotCamera(camera, obj, { aspect: r.width / r.height });
    camera.zoom = 1.3; camera.updateProjectionMatrix();   // fill the frame with the card
  };
  new ResizeObserver(frame).observe(stageEl);
  frame();
  const rest = shotRotation(obj.pose);
  const tilt = tilter(stageEl, 16);
  box.classList.add("live");
  whileVisible(stageEl, (t) => {
    const p = tilt();
    const sway = reduce ? 0 : Math.sin(t / 1400) * 7;
    card.rotation.set(rest.x + THREE.MathUtils.degToRad(p.x + sway * 0.4), rest.y + THREE.MathUtils.degToRad(p.y + sway), rest.z, "XYZ");
    holo.render(scene, camera);
  });
}

/* ───────── wiring ───────── */
window.holoKeepsake = (guest) => keepsake(guest).catch((e) => console.warn("keepsake", e));

const ringBox = document.querySelector(".holo-ring");
if (ringBox && hasGL2) {
  // start fetching a little before the gift section scrolls into view
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    ring(ringBox).catch((err) => console.warn("ring", err));
  }, { rootMargin: "600px" });
  io.observe(ringBox);
}

/* ───────── 3. the holographic cloth at night (footer) ───────── */
const clothBox = document.getElementById("cloth");
if (clothBox && hasGL2) {
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    try {
      await import("three");
      const { mountCloth } = await import(new URL("holocloth.js", import.meta.url).href);
      await mountCloth(clothBox, new URL("assets/img/names-white.png", location.href).href);
      clothBox.classList.add("live");
    } catch (err) { console.warn("cloth", err); }
  }, { rootMargin: "500px" });
  io.observe(clothBox);
}
