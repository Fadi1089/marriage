// Holographic foil touches, using the holospot kit (MIT, github.com/dmitrykurash/holospot).
//  1. a gift box in gold cracked-ice foil turning above the gift section
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

/* ───────── 1. the gift (assets/models/gift.glb), repainted in the invitation's colours ───────── */
// Plain three.js (no foil kit): the model's palette texture is recoloured, ribbon → sage, box → ivory.
const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/";
const GIFT_COLOURS = [
  { from: [255, 214, 54], to: [134, 160, 136] },   // yellow ribbon → sage
  { from: [190, 32, 32],  to: [247, 242, 230] },   // red box       → ivory
];
function repaint(THREE, map) {
  const img = map.image, c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    for (const { from, to } of GIFT_COLOURS) {
      const dr = px[i] - from[0], dg = px[i + 1] - from[1], db = px[i + 2] - from[2];
      if (dr * dr + dg * dg + db * db < 2600) {
        const shade = (px[i] + px[i + 1] + px[i + 2]) / (from[0] + from[1] + from[2]);   // keep light/dark variations
        px[i] = Math.min(255, to[0] * shade); px[i + 1] = Math.min(255, to[1] * shade); px[i + 2] = Math.min(255, to[2] * shade);
        break;
      }
    }
  }
  g.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = map.flipY; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
async function gift(box) {
  const [THREE, { GLTFLoader }, { DRACOLoader }] = await Promise.all([
    import("three"), import("three/addons/loaders/GLTFLoader.js"), import("three/addons/loaders/DRACOLoader.js"),
  ]);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  box.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  sizer(renderer, camera, box);

  const draco = new DRACOLoader().setDecoderPath(THREE_CDN + "libs/draco/gltf/");
  const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL("assets/models/gift.glb", location.href).href);
  const model = gltf.scene;
  // centre the box on the origin so it turns in place
  const bounds = new THREE.Box3().setFromObject(model), centre = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
  model.position.sub(centre);
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);
  const dist = (Math.max(size.x, size.y, size.z) * 1.55) / (2 * Math.tan(THREE.MathUtils.degToRad(15)));
  camera.position.set(0, size.y * 0.35, dist);
  camera.lookAt(0, 0, 0);

  model.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m.map) m.map = repaint(THREE, m.map);
    m.roughness = 0.55; m.metalness = 0;
    m.needsUpdate = true;
  });
  // soft daylight: warm key from the upper left, sage-tinted bounce from below
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfdccc, 1.6));
  const key = new THREE.DirectionalLight(0xfff6e8, 2.2); key.position.set(-1.5, 2.5, 2); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(2, 1, -2); scene.add(rim);

  const tilt = tilter(box, 14);
  box.classList.add("live");
  whileVisible(box, (t) => {
    const p = tilt();
    const spin = reduce ? 0.7 : t / 3400;
    pivot.rotation.set(THREE.MathUtils.degToRad(p.x * 0.6), spin + THREE.MathUtils.degToRad(p.y), 0);
    renderer.render(scene, camera);
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

const giftBox = document.querySelector(".holo-gift");
if (giftBox && hasGL2) {
  // start fetching a little before the gift section scrolls into view
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    gift(giftBox).catch((err) => console.warn("gift", err));
  }, { rootMargin: "600px" });
  io.observe(giftBox);
}
