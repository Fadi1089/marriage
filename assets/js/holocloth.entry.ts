// Source of holocloth.js. Build: npx esbuild@0.24.0 holocloth.entry.ts --bundle --format=esm --minify --define:import.meta.env.DEV=false --define:import.meta.env.PROD=true --external:three --external:'three/addons/*' --outfile=holocloth.js
// (with holocloth's src/ checked out at the import path below)
// Wedding-site wrapper around holocloth's HoloApp (MIT, github.com/dmitrykurash/holocloth).
// Tames it for a scrolling page: no camera orbit/zoom, no Space-bar capture, page scroll over the canvas on touch,
// and the render loop runs only while the cloth is on screen.
import { HoloApp, type HoloParams } from '/home/user/dmitrykurash/holocloth/src/scene.ts';

const PARAMS: HoloParams = {
  performance: 'Medium',
  physics: { viscosity: 0.6, stiffness: 1, iterations: 12, smoothing: 0.045, grabRadius: 0.32 },
  material: {
    preset: 'Holo', finish: 'Matte', baseColor: '#20242d', holoIntensity: 3.78, holoScale: 400, bandFreq: 1.1,
    saturation: 1, hueShift: 0.37, sparkle: 0.73, specTint: 0.33, iridescence: 0.81, roughness: 0.62, metalness: 1,
    clearcoat: 0.06, coatRoughness: 0.7, sheen: 0, bump: 3, bumpTiling: 3,
  },
  images: { edit: false, useImage: true, scale: 0.62, rotation: 0, opacity: 1, cornerRadius: 0 },
  render: {
    background: '#141a26', exposure: 0.5, environment: 0.73, bloom: 0.05, bloomThreshold: 1.41, noise: 0.07,
    toneMapping: 'Neutral', occlusion: true, occlusionStrength: 1, dof: false, dofAperture: 40, dofBlur: 0.04, dofRange: 0.3,
  },
};

const loadImg = (src: string) => new Promise<HTMLImageElement>((ok, no) => {
  const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src;
});

export async function mountCloth(host: HTMLElement, print: string) {
  const app = new HoloApp(host);
  const a = app as any;
  window.removeEventListener('keydown', a.onKeyDown);
  window.removeEventListener('keyup', a.onKeyUp);
  const canvas: HTMLCanvasElement = a.renderer.domElement;
  canvas.removeEventListener('wheel', a.onWheel);
  a.controls.enableZoom = false; a.controls.enableRotate = false; a.controls.enablePan = false;
  canvas.style.touchAction = 'pan-y';
  app.applyParams(PARAMS);
  app.addDecal(await loadImg(print));
  if (a.surface.selected) { a.surface.selected.scale = PARAMS.images.scale; a.surface.selected = null; a.surface.redraw(); }
  app.reveal();

  let on = true;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !on) { a.clock.getDelta(); a.renderer.setAnimationLoop(a.tick); on = true; }
    else if (!e.isIntersecting && on) { a.renderer.setAnimationLoop(null); on = false; }
  }, { rootMargin: '100px' }).observe(host);
  return app;
}
