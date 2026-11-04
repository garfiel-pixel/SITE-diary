/* Pave-Con icon set — 24x24 UI + 48 duotone tiles.
   Strokes: currentColor 2px, round caps/joins. Duotone variant fills the
   marked accent shape with var(--accent) so icons stay readable in dark
   mode and print. No hard-coded colours. The company logo is NOT an SVG —
   see src/assets/brand/logo.jpg. */
import type { SVGProps } from "react";
interface P {
  d: string;
  /** duotone accent shape (filled in 48px tiles) */
  accent?: boolean;
  /** closed shape that also strokes */
  shape?: boolean;
}
const I: Record<string, P[]> = {
  // ---- weather -----------------------------------------------------
  clear: [
    { d: "M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" },
    { d: "M12 17.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z", accent: true, shape: true },
  ],
  partly: [
    { d: "M6.5 6.5a3 3 0 1 1 6 1.5", shape: true },
    { d: "M1.8 8.5h1.4M12.7 3.6l.5 1.3M2.6 13.4l1.3-.6" },
    { d: "M8 20a4 4 0 0 1-.3-8 5 5 0 0 1 9.8-1 3.6 3.6 0 0 1-.5 9H8z", accent: true, shape: true },
  ],
  overcast: [
    { d: "M6 11a4 4 0 0 1-.4-8A5 5 0 0 1 15 4.5 3.5 3.5 0 0 1 18 8c0 .8-.2 1.4-.6 2" },
    { d: "M6.5 21a4 4 0 0 1-.3-8 5 5 0 0 1 9.8-1 3.6 3.6 0 0 1-.5 9H6.5z", accent: true, shape: true },
  ],
  showers: [
    { d: "M6.5 14a4 4 0 0 1-.3-8 5 5 0 0 1 9.8-1 3.6 3.6 0 0 1-.5 9H6.5z", accent: true, shape: true },
    { d: "M8 17.5 7 20M12 17.5l-1 2.5M16 17.5l-1 2.5" },
  ],
  heavy: [
    { d: "M6.5 13a4 4 0 0 1-.3-8 5 5 0 0 1 9.8-1 3.6 3.6 0 0 1-.5 9H6.5z", accent: true, shape: true },
    { d: "M6 16l-1 3M10 16l-1 3M14 16l-1 3M18 16l-1 3M8 21l-.8 2M12 21l-.8 2M16 21l-.8 2" },
  ],
  storm: [
    { d: "M6.5 13a4 4 0 0 1-.3-8 5 5 0 0 1 9.8-1 3.6 3.6 0 0 1-.5 9H6.5z", accent: true, shape: true },
    { d: "M12.5 13.5 10 18h4l-3.5 5", shape: true },
  ],
  // ---- time lost -----------------------------------------------------
  none: [{ d: "M4.5 12a7.5 7.5 0 1 0 15 0 7.5 7.5 0 0 0-15 0z", accent: true, shape: true }, { d: "M8.5 12.5 11 15l4.5-5.5" }],
  lossRain: [
    { d: "M7 12a4 4 0 0 1 8-1 3 3 0 0 1-.5 6H7.5z", accent: true, shape: true },
    { d: "M8 20l-1 2M13 20l-1 2" },
  ],
  breakdown: [
    { d: "M9.5 3.5 4 9l6.5 6.5M9 6l7 7" },
    { d: "M14 14a5.5 5.5 0 0 0 4.5-2.8L15.8 4 21 9.2A5.5 5.5 0 0 1 14 14z", accent: true, shape: true },
    { d: "M3.5 18.5 2 21h4l-1.5-2.5z" },
  ],
  lateMaterials: [
    { d: "M2.5 8.5h11v8h-11z", accent: true, shape: true },
    { d: "M13.5 11h4l3 3.5V16.5h-7z" },
    { d: "M6.5 16.5a1.8 1.8 0 1 0 0-.02zM17.5 16.5a1.8 1.8 0 1 0 0-.02z", shape: true },
  ],
  utilities: [
    { d: "M13.5 2 5.5 13h5L9.5 22l9-11.5h-5.5z", accent: true, shape: true },
  ],
  access: [
    { d: "M4 4v16M20 4v16" },
    { d: "M4 8l16-4M4 13l16-4M4 18l16-4", accent: true },
    { d: "M2.5 4h19M2.5 20h19" },
  ],
  lossOther: [
    { d: "M4.5 12a7.5 7.5 0 1 0 15 0 7.5 7.5 0 0 0-15 0z", accent: true, shape: true },
    { d: "M9.8 9.2A2.4 2.4 0 0 1 14 11c0 1.6-2 1.8-2 3.2M12 17.2h.01" },
  ],
  // ---- equipment -----------------------------------------------------
  excavator: [
    { d: "M4 15.5h10l-1 3H4z", accent: true, shape: true },
    { d: "M6.5 15.5V10h4v3.5M10.5 12l4-4 3 1.5" },
    { d: "M17.5 9.5c2 1 3.5 3 3.5 5.5h-4" },
    { d: "M2.5 21.5a1.8 1.8 0 1 0 0-.02zM13 21.5a1.8 1.8 0 1 0 0-.02z", shape: true },
  ],
  backhoe: [
    { d: "M18 15.5H8l1 3h10z", accent: true, shape: true },
    { d: "M17.5 15.5V10h-4v3.5M13.5 12l-4-4-3 1.5" },
    { d: "M6.5 9.5C4.5 10.5 3 12.5 3 15h4" },
    { d: "M21.5 21.5a1.8 1.8 0 1 0 0-.02zM11 21.5a1.8 1.8 0 1 0 0-.02z", shape: true },
  ],
  tipper: [
    { d: "M4 14 7 6.5l9 2.5-1.5 5z", accent: true, shape: true },
    { d: "M14.5 14h4l2.5 3v3h-16" },
    { d: "M6 20a1.8 1.8 0 1 0 0-.02zM17.5 20a1.8 1.8 0 1 0 0-.02z", shape: true },
  ],
  paver: [
    { d: "M3.5 9.5h11v6h-11z", accent: true, shape: true },
    { d: "M14.5 12h5l1.5 3.5h-6.5" },
    { d: "M2.5 17.5a2 2 0 1 0 0-.02zM10 17.5a2 2 0 1 0 0-.02zM19.5 17.5a2 2 0 1 0 0-.02z", shape: true },
  ],
  roller: [
    { d: "M4 7.5h9v5H4z", accent: true, shape: true },
    { d: "M13 10.5h4l3 2v3h-3" },
    { d: "M6.5 17.5a2.5 2.5 0 1 0 0-.02zM18 17.5a1.8 1.8 0 1 0 0-.02z", shape: true },
  ],
  grader: [
    { d: "M5 10h11v4H5z", accent: true, shape: true },
    { d: "M16 12l5-3-.5 3-4.5 2.5" },
    { d: "M3.5 18.5a1.8 1.8 0 1 0 0-.02zM10.5 18.5a1.8 1.8 0 1 0 0-.02zM18 18.5a1.8 1.8 0 1 0 0-.02z", shape: true },
    { d: "M1.5 20.5h21" },
  ],
  miller: [
    { d: "M4 5.5h12l2 5H4z", accent: true, shape: true },
    { d: "M3 13.5h15v2H3z" },
    { d: "M4.5 15.5l-1.5 5M8 15.5l-1 5M12 15.5l.4 5M16.5 15.5l2 5", accent: false },
  ],
  bowser: [
    { d: "M4 9h13a2.5 2.5 0 0 1 2.5 2.5v3H4z", accent: true, shape: true },
    { d: "M6.5 6.5V9M17.5 6.5V9" },
    { d: "M7 16.5a2 2 0 1 0 0-.02zM17 16.5a2 2 0 1 0 0-.02z", shape: true },
    { d: "M2.5 20.5h19" },
  ],
  mixer: [
    { d: "M7 4.5 15.5 9l-3.5 7-8-4z", accent: true, shape: true },
    { d: "M15.5 9l4 2" },
    { d: "M4.5 21.5a1.8 1.8 0 1 0 0-.02zM13.5 21.5a1.8 1.8 0 1 0 0-.02z", shape: true },
    { d: "M9 16.5h8v3H9" },
  ],
  crane: [
    { d: "M6 21V5l13 2.5", accent: false },
    { d: "M19 7.5V14" },
    { d: "M16 14h6l-3 5z", accent: true, shape: true },
    { d: "M2.5 21.5h8" },
  ],
  generator: [
    { d: "M3 8h15v9H3z", accent: true, shape: true },
    { d: "M18 10h3v6h-3" },
    { d: "M6.5 5.5h4M19 5.5l1-1" },
    { d: "M10.5 10.5 8 13.5h4l-2.5 3.2" },
  ],
  bobcat: [
    { d: "M5 9.5h9l1 6H4z", accent: true, shape: true },
    { d: "M14 13h4l2 2.5" },
    { d: "M6.5 19a2 2 0 1 0 0-.02zM16.5 19a2 2 0 1 0 0-.02z", shape: true },
  ],
  eqOther: [
    { d: "M5 12a1.5 1.5 0 1 0 0-.02zM12 12a1.5 1.5 0 1 0 0-.02zM19 12a1.5 1.5 0 1 0 0-.02z" },
  ],
  // ---- materials -----------------------------------------------------
  matAsphalt: [
    { d: "M2.5 18 6 8h12l3.5 10z", accent: true, shape: true },
    { d: "M12 9.5v2M10 13.5h4M11 17h2" },
  ],
  matMarl: [
    { d: "M2.5 18h19l-3-6-4 3-4-6z", accent: true, shape: true },
    { d: "M4 21h16" },
  ],
  matGravel: [
    { d: "M3.5 17h17l-2-4-5 2-4-5z", accent: true, shape: true },
    { d: "M8 8.5h1M13 6.5h1M16.5 9.5h1M11 10.5h1", },
  ],
  matSand: [
    { d: "M3 18h18l-4-4-4 2-3-5z", accent: true, shape: true },
    { d: "M3 21h18" },
  ],
  matCement: [
    { d: "M6 4.5h12l1.5 15H4.5z", accent: true, shape: true },
    { d: "M4.5 9h15M6 6v2M9.5 6v2M14.5 6v2M18 6v2" },
  ],
  matBlocks: [
    { d: "M3.5 13h8v7h-8zM12.5 13h8v7h-8zM8 4h8v7H8z", accent: true, shape: true },
  ],
  matRebar: [
    { d: "M3 12l3-6 4 12 4-12 4 12 3-6", accent: false },
    { d: "M2 12h20" },
  ],
  matReadymix: [
    { d: "M4 9.5 11 6l4 6.5-6.5 3z", accent: true, shape: true },
    { d: "M15 12.5h4l2 3v2h-14v-3h8" },
    { d: "M8 20a1.6 1.6 0 1 0 0-.02zM16 20a1.6 1.6 0 1 0 0-.02z", shape: true },
  ],
  matTack: [
    { d: "M7 3.5h10v5H7z", accent: true, shape: true },
    { d: "M8.5 8.5v9h7v-9M10 20.5h4" },
  ],
  matPipe: [
    { d: "M5 9h11a3.5 3.5 0 0 1 3.5 3.5v3H8.5", accent: true, shape: true },
    { d: "M5 9a3.5 3.5 0 0 1 0 9.5M8.5 15.5a3.5 3.5 0 0 1 .5-6.5" },
  ],
  matKerb: [
    { d: "M4 4h7v7h9v9H4z", accent: true, shape: true },
    { d: "M4 11h7v9" },
  ],
  matOther: [
    { d: "M5 12a1.5 1.5 0 1 0 0-.02zM12 12a1.5 1.5 0 1 0 0-.02zM19 12a1.5 1.5 0 1 0 0-.02z" },
  ],
  // ---- trades (person variants) ---------------------------------------
  supervisor: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
    { d: "M18.5 2.5l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L15.5 4.8l2-.3z" },
  ],
  paverOp: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
    { d: "M19 3.5v6l3-1.5" },
  ],
  rollerDrv: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
    { d: "M17.5 5.5h4.5a2 2 0 1 0 0-4" },
  ],
  raker: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
    { d: "M16 3.5l5 5M19.5 2l2.5 2.5M2 6.5h5", },
  ],
  labourer: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
    { d: "M18 14v6l3-3z" },
  ],
  flagman: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
    { d: "M18.5 2v12M18.5 3l4 2-4 2", accent: true },
  ],
  mason: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
    { d: "M17 5l4-2-1.5 4z" },
  ],
  steelFixer: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
    { d: "M17 3.5l4 3-4 3 4 3" },
  ],
  carpenter: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
    { d: "M16.5 4h5l-1.5 4-3.5-1z" },
  ],
  electrician: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
    { d: "M18.5 1.5 15.5 6h2.5L15 10", },
  ],
  plumber: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
    { d: "M15.5 5.5c2-2 5-.5 5 1l-3.5 3-2.5-2.5z" },
  ],
  driver: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
    { d: "M16.5 5.5a4 4 0 1 0 6 3M21 9.5V7M21 7h-2.5" },
  ],
  // ---- ui ---------------------------------------------------------------
  camera: [
    { d: "M3 8.5A2.5 2.5 0 0 1 5.5 6h1.6l1.6-2.5h6.6L16.9 6h1.6A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z", accent: true, shape: true },
    { d: "M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", shape: true },
  ],
  gallery: [
    { d: "M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5z", accent: true, shape: true },
    { d: "m3 16 5-4 4.5 4L16 12l5 4.5M15 8.5h.01" },
  ],
  check: [{ d: "M4 12.5 9.5 18 20 6.5", shape: true }],
  plus: [{ d: "M12 4.5v15M4.5 12h15", shape: true }],
  minus: [{ d: "M4.5 12h15", shape: true }],
  trash: [
    { d: "M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13z", accent: true, shape: true },
    { d: "M10 11v5M14 11v5" },
  ],
  undo: [
    { d: "M8.5 4.5 4 9l4.5 4.5", accent: false },
    { d: "M4 9h11a5.5 5.5 0 0 1 0 11h-3" },
  ],
  share: [
    { d: "M12 3v11", accent: false },
    { d: "M8 7l4-4 4 4" },
    { d: "M5 13h2.5v8h11v-8H21", shape: true },
  ],
  download: [
    { d: "M12 3v11M8 10.5 12 14.5l4-4", accent: false },
    { d: "M4 17v3.5h16V17", shape: true },
  ],
  cloudSaved: [
    { d: "M6.5 18a4 4 0 0 1-.3-8 5 5 0 0 1 9.8-1 3.6 3.6 0 0 1-.5 9H6.5z", accent: true, shape: true },
    { d: "M9.5 13.5 11.5 15.5 15 11.5" },
  ],
  cloudUploading: [
    { d: "M6.5 18a4 4 0 0 1-.3-8 5 5 0 0 1 9.8-1 3.6 3.6 0 0 1-.5 9H6.5z", accent: true, shape: true },
    { d: "M12 16v-4M9.5 14.5 12 12l2.5 2.5" },
  ],
  cloudDone: [
    { d: "M6.5 18a4 4 0 0 1-.3-8 5 5 0 0 1 9.8-1 3.6 3.6 0 0 1-.5 9H6.5z", accent: true },
    { d: "M6.5 18a4 4 0 0 1-.3-8 5 5 0 0 1 9.8-1 3.6 3.6 0 0 1-.5 9H6.5z" },
    { d: "M9.5 13.5 11.5 15.5 15 11.5" },
  ],
  lock: [
    { d: "M5.5 10.5h13V20h-13z", accent: true, shape: true },
    { d: "M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5M12 14v3" },
  ],
  sun: [
    { d: "M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" },
    { d: "M12 17.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z", accent: true, shape: true },
  ],
  moon: [
    { d: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z", accent: true, shape: true },
  ],
  calendar: [
    { d: "M4.5 5.5h15v15h-15z", accent: true, shape: true },
    { d: "M4.5 10h15M8.5 3v4M15.5 3v4" },
  ],
  clock: [
    { d: "M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0z", accent: true, shape: true },
    { d: "M12 7.5V12l3 2" },
  ],
  user: [
    { d: "M5 20.5c0-4 2.7-6.5 7-6.5s7 2.5 7 6.5", accent: true },
    { d: "M12 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", accent: true, shape: true },
  ],
  users: [
    { d: "M4 20c0-3.5 2.3-5.5 6-5.5s6 2 6 5.5", accent: true },
    { d: "M10 10.5a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z", shape: true },
    { d: "M16 5.2a2.8 2.8 0 0 1 0 5.4M17.5 14.7c2 .7 3.2 2.3 3.2 4.8" },
  ],
  warning: [
    { d: "M12 3.5 2.5 20.5h19z", accent: true, shape: true },
    { d: "M12 10v4.5M12 17.5h.01" },
  ],
};
const weatherIconNames = ["clear", "partly", "overcast", "showers", "heavy", "storm"] as const;
export type IconName = string;
export interface IconProps {
  name: IconName;
  size?: number;
  /** duotone 48px tile variant */
  duo?: boolean;
  label?: string;
  className?: string;
}
export function Icon({ name, size = 24, duo = false, label, className }: IconProps) {
  const paths: P[] | undefined = I[name];
  const px = size;
  const sw = duo ? 2.2 : 2;
  const common: SVGProps<SVGSVGElement> = {
    width: px,
    height: px,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: sw,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": label ? undefined : true,
    role: label ? "img" : undefined,
    "aria-label": label,
    focusable: false,
  };
  if (!paths) {
    return <div style={{ width: px, height: px }} data-missing-icon={name} />;
  }
  return (
    <svg {...common}>
      {paths.map((p, i) => {
        /* Duotone keeps the outline and adds one accent-filled shape behind
           it. Accent-only paths still stroke so the silhouette never relies
           on the yellow fill alone (print + forced colours). */
        const tinted = duo && p.accent;
        return (
          <path
            key={i}
            d={p.d}
            fill={tinted ? "var(--accent)" : "none"}
            fillOpacity={tinted ? 0.35 : undefined}
            stroke="currentColor"
          />
        );
      })}
    </svg>
  );
}
/** Names of weather icons mapped to WeatherKey values. */
export const weatherIcon = (k: string) =>
  weatherIconNames.includes(k as never) ? k : "clear";

/** Every registered icon name (dev-only /icons gallery). */
export const ALL_ICONS: string[] = Object.keys(I);
