"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* =====================================================================
   CONTENT: everything placeholder lives here.
   ===================================================================== */

// Seal image: put a transparent PNG in the "public" folder (e.g. public/seal.png)
// then change "" to "/seal.png". Leave "" to show the placeholder medallion.
const SEAL_SRC = "";

const DAYS = 9131;

// Childhood photos: put images in public/photos/ and set src to e.g. "/photos/kid-1.jpg".
// x / y = position on screen in %, rot = tilt, framed = Polaroid (true) or frameless (false),
// from = which side it flies in from: [-1,0] left, [1,0] right, [0,-1] top, [0,1] bottom.
const childhoodPhotos = [
  { src: "", x: 4,  y: 8,  rot: -8, framed: true,  from: [-1, -1], colors: ["#ff7a59", "#ffb36b"] },
  { src: "", x: 72, y: 6,  rot: 7,  framed: true,  from: [1, -1],  colors: ["#7be0c3", "#3aa6d9"] },
  { src: "", x: 14, y: 58, rot: 5,  framed: false, from: [-1, 1],  colors: ["#f78fb3", "#c77dff"] },
  { src: "", x: 80, y: 52, rot: -6, framed: true,  from: [1, 1],   colors: ["#ffd166", "#ef8354"] },
  { src: "", x: 38, y: 70, rot: -4, framed: true,  from: [0, 1],   colors: ["#9bb4ff", "#5a6cff"] },
  { src: "", x: 56, y: 2,  rot: 4,  framed: false, from: [0, -1],  colors: ["#ff9bd2", "#8f6bff"] },
  { src: "", x: 2,  y: 32, rot: 9,  framed: true,  from: [-1, 0],  colors: ["#bde0fe", "#a2d2ff"] },
  { src: "", x: 88, y: 28, rot: -9, framed: false, from: [1, 0],   colors: ["#ffc8a2", "#ff8fa3"] },
];

// The dotted trail leaves the 9,131 scene from here (x % across the screen).
// Keep this equal to the first trail scene's "entry".
const DAYS_TRAIL_X = 46;

// Trail scenes. Each photo: x / y = CENTER of the photo in % of the screen,
// rot = tilt, framed = Polaroid or frameless, src = "/photos/your-file.jpg" ("" = placeholder).
// Add or remove photos freely (5 to 8 works best); the dotted line re-routes through them.
// entry / exit = where the trail comes in at the top / leaves at the bottom (% across).
// gentle = true gives slower, quieter motion.
type Photo = { src: string; x: number; y: number; rot: number; framed: boolean; mum?: boolean };
type Scene = {
  id: string; word: string; bg: string; ink: string; line: string;
  entry: number; exit?: number; gentle?: boolean; tints: string[][]; photos: Photo[];
};

// Photo of Aima with her mum. Put it at public/photos/mum.jpg and set src to "/photos/mum.jpg".
const MOTHER_PHOTO = { src: "", caption: "" };

const trailScenes: Scene[] = [
  {
    id: "joy", word: "Joy.", bg: "#ff4a1c", ink: "#fff3e4", line: "#fff3e4",
    entry: 46, exit: 72,
    tints: [["#ffd84d", "#ff9a5c"], ["#fff3e4", "#ffc2a0"], ["#2fb457", "#0d4d3b"], ["#ff9bd2", "#ff6b6b"]],
    photos: [
      { src: "", x: 30, y: 15, rot: -7, framed: true },
      { src: "", x: 66, y: 27, rot: 6,  framed: true },
      { src: "", x: 26, y: 41, rot: 5,  framed: false },
      { src: "", x: 72, y: 52, rot: -6, framed: true },
      { src: "", x: 30, y: 65, rot: -4, framed: true },
      { src: "", x: 66, y: 77, rot: 7,  framed: false },
      { src: "", x: 40, y: 88, rot: 3,  framed: true },
    ],
  },
  {
    id: "growth", word: "Growth.", bg: "#2fb457", ink: "#0d2a17", line: "#0d2a17",
    entry: 72, exit: 30,
    tints: [["#ffd84d", "#f2a900"], ["#fff3e4", "#c9f0d2"], ["#ff4a1c", "#ff8a65"], ["#0d4d3b", "#1b7a5a"]],
    photos: [
      { src: "", x: 74, y: 15, rot: 5,  framed: true },
      { src: "", x: 32, y: 28, rot: -6, framed: true },
      { src: "", x: 70, y: 43, rot: -4, framed: false },
      { src: "", x: 30, y: 57, rot: 7,  framed: true },
      { src: "", x: 68, y: 71, rot: -5, framed: true },
      { src: "", x: 36, y: 84, rot: 4,  framed: false },
    ],
  },
  {
    id: "grief", word: "Grief.", bg: "#120a08", ink: "#fff3e4", line: "#d8cfc4",
    entry: 30, gentle: true,
    tints: [["#4a3f3a", "#2a2220"], ["#5a4d46", "#3a2f2b"], ["#3d3834", "#201a18"], ["#6a5a50", "#3a302b"]],
    photos: [
      { src: "", x: 26, y: 16, rot: -3, framed: true },
      { src: "", x: 72, y: 20, rot: 3,  framed: true },
      { src: "", x: 24, y: 46, rot: 2,  framed: false },
      { src: "", x: 76, y: 48, rot: -2, framed: true },
      { src: MOTHER_PHOTO.src, x: 50, y: 67, rot: 0, framed: true, mum: true },
    ],
  },
];

/* ===================================================================== */

// Smooth curve through points (Catmull-Rom converted to bezier). Coordinates are 0 to 1000.
function trailPath(pts: [number, number][]) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function Trail({ id, d, color }: { id: string; d: string; color: string }) {
  return (
    <svg className="trailsvg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <mask id={"m-" + id} maskUnits="userSpaceOnUse" x="-50" y="-50" width="1100" height="1100">
          <path className="reveal" d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth="60"
            strokeDasharray="1" strokeDashoffset="1" />
        </mask>
      </defs>
      <path d={d} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray="1 14"
        vectorEffect="non-scaling-stroke" mask={`url(#m-${id})`} />
    </svg>
  );
}

function TrailScene({ s }: { s: Scene }) {
  const pts: [number, number][] = [
    [s.entry * 10, 0],
    ...s.photos.map((p) => [p.x * 10, p.y * 10] as [number, number]),
    ...(s.exit !== undefined ? ([[s.exit * 10, 1000]] as [number, number][]) : []),
  ];
  return (
    <section id={s.id} className="trail" style={{ background: s.bg, color: s.ink }} aria-label={s.word}>
      <div className="word"><div className="mask"><span>{s.word}</span></div></div>
      <Trail id={s.id} d={trailPath(pts)} color={s.line} />
      <div className="polas">
        {s.photos.map((p, i) => {
          const t = s.tints[i % s.tints.length];
          return (
            <div key={i} className={"pola" + (p.framed ? "" : " free") + (p.mum ? " mum" : "")}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              {p.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.src} alt="" />
              ) : (
                <div className="ph" style={{ background: `linear-gradient(145deg,${t[0]},${t[1]})` }}>
                  {p.mum ? "photo with your mum" : `${s.id} photo ${i + 1}`}
                </div>
              )}
              {p.mum && MOTHER_PHOTO.caption && <figcaption>{MOTHER_PHOTO.caption}</figcaption>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Disc() {
  return SEAL_SRC ? (
    <div className="disc img" style={{ backgroundImage: `url(${SEAL_SRC})` }} />
  ) : (
    <div className="disc"><b>AJ</b></div>
  );
}

export default function Home() {
  const main = useRef<HTMLDivElement>(null);
  const audio = useRef<{ ctx: AudioContext; master: GainNode } | null>(null);
  const opened = useRef(false);
  const [audioOn, setAudioOn] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = document.documentElement;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    root.classList.add("locked");

    const ctx = gsap.context(() => {
      // Opening entrance
      gsap.timeline({ defaults: { ease: "power4.out" } })
        .fromTo("#invite h1 i", { yPercent: 105, opacity: 1 }, { yPercent: 0, duration: 1.3, stagger: 0.14 })
        .to("#invite h2", { opacity: 1, duration: 0.9 }, "-=0.6")
        .to("#invite .tagline", { opacity: 1, duration: 0.9 }, "-=0.5")
        .fromTo(".sealwrap", { opacity: 0, scale: 0.85, rotate: -8 },
          { opacity: 1, scale: 1, rotate: 0, duration: 1.4, ease: "back.out(1.4)" }, 0.5);

      // Scene 01: days on Earth
      const counter = { v: 0 };
      const numEl = document.getElementById("num")!;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: "#days", start: "top top", end: "+=4200", scrub: 0.8, pin: true, anticipatePin: 1 },
      });
      tl.to(counter, {
        v: DAYS, duration: 2.2, ease: "power2.out",
        onUpdate: () => { numEl.textContent = Math.round(counter.v).toLocaleString("en-US"); },
      }, 0);

      gsap.utils.toArray<HTMLElement>("#days .pola").forEach((el, i) => {
        const p = childhoodPhotos[i];
        tl.fromTo(el,
          { x: p.from[0] * window.innerWidth * 0.9, y: p.from[1] * window.innerHeight * 0.9,
            rotation: p.rot + (i % 2 ? 45 : -45), scale: 0.55, opacity: 0 },
          { x: 0, y: 0, rotation: p.rot, scale: 1, opacity: 1, duration: 1.4, ease: "power3.out" },
          0.4 + i * 0.4);
        tl.to(el, { y: (i % 2 ? -1 : 1) * 40, rotation: p.rot + (i % 2 ? 3 : -3), duration: 3, ease: "none" }, 2.2);
      });

      tl.to("#days .bg", { opacity: 1, duration: 1.2 }, 3.6)
        .to(".stage", { color: "#0d3b2e", duration: 1.2 }, 3.6)
        .to("#sub", { opacity: 1, duration: 0.8 }, 3.9)
        .fromTo("#days .reveal", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: "none" }, 3.9)
        .to({}, { duration: 0.8 });

      // Trail scenes: Joy / Growth / Grief
      trailScenes.forEach((s) => {
        const sel = "#" + s.id;
        const R = 6; // how long the trail takes to draw
        const t = gsap.timeline({
          scrollTrigger: { trigger: sel, start: "top top", end: "+=3800", scrub: 0.8, pin: true, anticipatePin: 1 },
        });
        const els = gsap.utils.toArray<HTMLElement>(sel + " .pola");
        gsap.set(els, { xPercent: -50, yPercent: -50, autoAlpha: 0 });

        t.fromTo(sel + " .mask span", { yPercent: 115 },
          { yPercent: 0, duration: s.gentle ? 1.3 : 0.9, ease: s.gentle ? "power2.out" : "power4.out" }, 0)
          .fromTo(sel + " .reveal", { strokeDashoffset: 1 },
            { strokeDashoffset: 0, duration: R, ease: "none" }, 0.5);

        const segs = s.exit !== undefined ? s.photos.length + 1 : s.photos.length;
        els.forEach((el, i) => {
          const p = s.photos[i];
          const at = 0.5 + R * ((i + 1) / segs) - 0.2;
          if (s.gentle) {
            t.fromTo(el, { autoAlpha: 0, y: 20, rotation: p.rot },
              { autoAlpha: 1, y: 0, duration: 1.5, ease: "power1.out" }, at);
          } else {
            t.fromTo(el, { autoAlpha: 0, scale: 0, rotation: p.rot - 25 },
              { autoAlpha: 1, scale: 1, rotation: p.rot, duration: 0.7, ease: "back.out(1.6)" }, at);
          }
        });

        t.to(sel + " .word", { opacity: 0.28, duration: 1.2 }, R * 0.7)
          .to({}, { duration: 1.2 });
      });
    }, main);

    return () => { ctx.revert(); root.classList.remove("locked"); };
  }, []);

  // Placeholder sound (replace with real MP3 snippets later)
  function startAudio() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new AC();
    if (ac.state === "suspended") ac.resume();
    const master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.09;
      o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
      o.start(t); o.stop(t + 2.5);
    });
    audio.current = { ctx: ac, master };
    setAudioOn(true);
  }

  function toggleMute() {
    const a = audio.current;
    if (!a) return;
    const next = !muted;
    a.master.gain.linearRampToValueAtTime(next ? 0 : 0.5, a.ctx.currentTime + 0.25);
    setMuted(next);
  }

  function openSeal() {
    if (opened.current) return;
    opened.current = true;
    startAudio();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove("locked");
        window.scrollTo({ top: window.innerHeight, behavior: reduce ? "auto" : "smooth" });
      },
    });
    tl.to(".hint", { opacity: 0, duration: 0.2 }, 0)
      .to(".seal", { scale: 1.06, duration: 0.12, yoyo: true, repeat: 1 }, 0)
      .to(".flash", { opacity: 0.9, duration: 0.12, yoyo: true, repeat: 1 }, 0.1)
      .to(".half.l", { x: "-60vw", y: "40vh", rotate: -35, duration: 1.1, ease: "power3.in" }, 0.22)
      .to(".half.r", { x: "60vw", y: "46vh", rotate: 30, duration: 1.1, ease: "power3.in" }, 0.22)
      .to("#invite .copy", { y: -60, opacity: 0, duration: 0.9, ease: "power2.in" }, 0.3);
    if (reduce) tl.progress(1);
  }

  const daysTrail = `M${DAYS_TRAIL_X * 10} 780 C ${DAYS_TRAIL_X * 10} 860, ${DAYS_TRAIL_X * 10 - 20} 930, ${DAYS_TRAIL_X * 10} 1000`;

  return (
    <div ref={main}>
      {audioOn && (
        <button id="mute" aria-label="Mute or unmute music" onClick={toggleMute} style={{ opacity: muted ? 0.5 : 1 }}>
          {muted ? "×" : "♪"}
        </button>
      )}
      <div className="flash" />

      <section id="invite">
        <div className="copy">
          <h1>
            <span><i>Happy Silver</i></span>
            <span><i>Jubilee, Aima J.</i></span>
          </h1>
          <h2>Welcome to your Wrapped</h2>
          <p className="tagline">a look at your journey to 25</p>
        </div>
        <div className="sealwrap">
          <button className="seal" onClick={openSeal} aria-label="Break the seal to begin">
            <div className="half l"><Disc /></div>
            <div className="half r"><Disc /></div>
          </button>
          <span className="hint">break the seal</span>
        </div>
      </section>

      <section id="days" aria-label="Days on Earth">
        <div className="bg" />
        <Trail id="days" d={daysTrail} color="#0d3b2e" />
        <div className="polas">
          {childhoodPhotos.map((p, i) => (
            <div key={i} className={"pola" + (p.framed ? "" : " free")} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              {p.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.src} alt="" />
              ) : (
                <div className="ph" style={{ background: `linear-gradient(145deg,${p.colors[0]},${p.colors[1]})` }}>
                  childhood photo {i + 1}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="stage">
          <div>
            <p className="pre">you’ve spent</p>
            <div className="num" id="num">0</div>
            <p className="post">days on planet Earth.</p>
            <p className="sub" id="sub">that’s 219,144 hours. 13,148,640 minutes.</p>
          </div>
        </div>
      </section>

      {trailScenes.map((s) => <TrailScene key={s.id} s={s} />)}

      <div className="end">And somewhere along the way, friends come next.</div>
    </div>
  );
}