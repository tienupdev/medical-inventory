"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// --- Constants ---
import {
  CIRCLE_SIZE,
  STROKE_WIDTH,
  ANIMATION_FADE_MS,
  ANIMATION_HOLD_MS,
  RESTART_ANIMATION_AFTER_MS,
  DELAY,
  CAMERA_VIEWPOINT,
  CAMERA_TARGET,
  VIEWPOINT_DISTANCE_Z,
  MAX_FPS,
  SMILEY_DEPTH,
  PLANE_SEGMENTS,
  RING_SIZE,
  MINIMUM_CIRCLE_SIZE,
  IS_ANIMATING,
  IS_FROM_OUTER_TO_INNER,
  ANIMATION_LOOP_FROM,
  ANIMATION_LOOP_TO,
  ANALYSIS_HOP_SAMPLES,
  ANALYSIS_WINDOW_SAMPLES,
  ONSET_WINDOW_MS,
  ONSET_DB_RISE,
  ONSET_MIN_GAP_MS,
  ONSET_DB_FLOOR_MARGIN,
  ONSET_PEAK_WINDOW_MS,
  LOOP_AUDIO,
  MIN_OPACITY,
  MAX_OPACITY,
  STRENGTH_CEIL_PERCENTILE,
  STRENGTH_FLOOR_PERCENTILE,
} from "./constants";

type Circle = { diameter: number; filled: boolean };

/**
 * Build the list of concentric circles, outer -> inner.
 * - Stroked circles for every diameter strictly greater than 50.
 * - The innermost circle (diameter <= 50, i.e. exactly 50 here) is filled white.
 */
function buildCircles(): Circle[] {
  const circles: Circle[] = [];
  let d = CIRCLE_SIZE;
  while (d > MINIMUM_CIRCLE_SIZE) {
    circles.push({ diameter: d, filled: false });
    d -= RING_SIZE;
  }
  circles.push({ diameter: d, filled: true }); // innermost <= 50 -> filled
  return circles;
}

type Analysis = {
  chainStarts: { time: number; peak: number }[];
  durationMs: number;
};

/**
 * Precompute the sound-reactor timeline from a decoded audio buffer.
 *
 * - Downmix to mono and compute a per-frame RMS -> dB curve (overall loudness).
 * - Map dB to "strength" in [MIN_OPACITY, MAX_OPACITY], NORMALIZED to the track's
 *   own dynamic range (percentiles) — not absolute dB thresholds — so band-limited
 *   (1-3kHz) signals map correctly.
 * - Detect onsets (significant RELATIVE dB increases above a relative noise
 *   floor); each onset records the PEAK strength shortly after it (the crest
 *   follows the onset frame, not the onset frame itself).
 * - Build "chain starts": each onset re-triggers the staggered circle chain
 *   from the start; RESTART_ANIMATION_AFTER_MS is a fallback when no onset
 *   occurs (restart happens at the earlier of the next onset and the timer).
 *   Each chain start carries its peak strength (the recorded onset strength, or
 *   the sampled strength for a fallback chain).
 *
 * No DSP/effects are applied to the audible audio — this analysis is fully
 * offline and independent of playback.
 */
function computeAnalysis(audioBuffer: AudioBuffer): Analysis {
  const sampleRate = audioBuffer.sampleRate;
  const numCh = audioBuffer.numberOfChannels;
  const len = audioBuffer.length;

  // Downmix all channels to mono.
  const mono = new Float32Array(len);
  for (let ch = 0; ch < numCh; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < len; i++) mono[i] += data[i] / numCh;
  }

  const durationMs = (len / sampleRate) * 1000;

  // Analysis frame: RMS over a window of W samples, advanced by H samples.
  const H = ANALYSIS_HOP_SAMPLES;
  const W = ANALYSIS_WINDOW_SAMPLES;
  if (len < W) {
    return { chainStarts: [{ time: 0, peak: MIN_OPACITY }], durationMs };
  }
  const numFrames = Math.floor((len - W) / H) + 1;
  const hopMs = (H / sampleRate) * 1000;

  // Per-frame dB curve (overall loudness over time).
  const db = new Float32Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    let sum = 0;
    const off = f * H;
    for (let i = 0; i < W; i++) {
      const s = mono[off + i];
      sum += s * s;
    }
    const rms = Math.sqrt(sum / W);
    db[f] = 20 * Math.log10(rms + 1e-7);
  }

  // --- Dynamic-range normalization ---
  // Band-limited signals (e.g. 1-3kHz) have low absolute dB, so we normalize the
  // dB curve to the track's OWN dynamic range before mapping to strength. No
  // absolute dB thresholds are used.
  const sortedDb = Array.from(db).sort((a, b) => a - b);
  const percentile = (p: number) =>
    sortedDb[
      Math.min(sortedDb.length - 1, Math.max(0, Math.floor(p * sortedDb.length)))
    ];
  const dbCeil = percentile(STRENGTH_CEIL_PERCENTILE);
  const dbFloor = percentile(STRENGTH_FLOOR_PERCENTILE);
  const dbRange = dbCeil - dbFloor || 1;

  // dB -> strength in [MIN_OPACITY, MAX_OPACITY], clamped.
  const strength = new Float32Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    const t = (db[f] - dbFloor) / dbRange;
    strength[f] =
      MIN_OPACITY + Math.max(0, Math.min(1, t)) * (MAX_OPACITY - MIN_OPACITY);
  }
  const strengthAt = (ms: number) => {
    const idx = Math.round(ms / hopMs);
    return strength[Math.max(0, Math.min(numFrames - 1, idx))];
  };

  // Peak strength in a window AFTER an onset — the actual peak follows the onset
  // frame (the onset is the *start* of the rise, not its crest).
  const peakStrengthAfter = (ms: number, windowMs: number) => {
    const startIdx = Math.max(0, Math.round(ms / hopMs));
    const endIdx = Math.min(
      numFrames - 1,
      Math.round((ms + windowMs) / hopMs),
    );
    let peak = MIN_OPACITY;
    for (let f = startIdx; f <= endIdx; f++) {
      if (strength[f] > peak) peak = strength[f];
    }
    return peak;
  };

  // Onsets: significant RELATIVE dB increases, above a RELATIVE noise floor.
  const windowFrames = Math.max(1, Math.round(ONSET_WINDOW_MS / hopMs));
  const minGapFrames = Math.max(1, Math.round(ONSET_MIN_GAP_MS / hopMs));
  const onsetFloor = dbFloor + ONSET_DB_FLOOR_MARGIN;
  const onsets: { time: number; strength: number }[] = [];
  let lastOnsetFrame = -minGapFrames;
  for (let f = windowFrames; f < numFrames; f++) {
    const rise = db[f] - db[f - windowFrames];
    if (
      rise >= ONSET_DB_RISE &&
      db[f] > onsetFloor &&
      f - lastOnsetFrame >= minGapFrames
    ) {
      const onsetMs = f * hopMs;
      onsets.push({
        time: onsetMs,
        strength: peakStrengthAfter(onsetMs, ONSET_PEAK_WINDOW_MS),
      });
      lastOnsetFrame = f;
    }
  }

  console.log("[sound-reactor]", {
    durationMs,
    dbRange: { dbFloor, dbCeil },
    onsets: onsets.length,
    firstOnsets: onsets.slice(0, 8),
  });

  // Chain starts: each onset re-triggers the staggered chain from the start;
  // RESTART_ANIMATION_AFTER_MS is a fallback when no onset occurs (earlier wins).
  const chainStarts: { time: number; peak: number }[] = [];
  // -RESTART makes the first fallback candidate t = 0 (immediate first chain).
  let lastStart = -RESTART_ANIMATION_AFTER_MS;
  let oi = 0;
  for (let guard = 0; guard < 100000; guard++) {
    const fallback = lastStart + RESTART_ANIMATION_AFTER_MS;
    while (oi < onsets.length && onsets[oi].time <= lastStart) oi++;
    const nextOnset = oi < onsets.length ? onsets[oi].time : Infinity;
    let start: number;
    let peak: number;
    if (nextOnset <= fallback) {
      start = nextOnset;
      peak = onsets[oi].strength;
      oi++;
    } else {
      start = fallback;
      peak = strengthAt(start);
    }
    if (start > durationMs) break;
    if (start >= 0) chainStarts.push({ time: start, peak });
    lastStart = start;
  }

  return { chainStarts, durationMs };
}

export default function CanvasPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "playing" | "ended"
  >("idle");
  const analysisRef = useRef<Analysis | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioStartTimeRef = useRef<number>(0);
  const startRenderLoopRef = useRef<((fn: () => number) => void) | null>(null);
  const stopRenderLoopRef = useRef<(() => void) | null>(null);

  /**
   * Decode (once) + precompute the analysis, then play the audio as-is (no
   * effects) and switch the render loop to audio playback time.
   */
  const handleStart = async () => {
    try {
      setStatus("loading");

      let ctx = audioCtxRef.current;
      if (!ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        ctx = new AudioCtx();
        audioCtxRef.current = ctx;
      }
      if (ctx.state === "suspended") await ctx.resume();

      // Stop any previously playing source.
      if (sourceRef.current) {
        try {
          sourceRef.current.onended = null;
          sourceRef.current.stop();
        } catch {
          /* already stopped */
        }
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }

      let audioBuffer = audioBufferRef.current;
      if (!audioBuffer) {
        const resp = await fetch("/sound.wav");
        const arr = await resp.arrayBuffer();
        audioBuffer = await ctx.decodeAudioData(arr);
        audioBufferRef.current = audioBuffer;
      }

      // Precompute the dB -> strength timeline + chain restarts (once).
      if (!analysisRef.current) {
        analysisRef.current = computeAnalysis(audioBuffer);
      }

      const src = ctx.createBufferSource();
      src.buffer = audioBuffer;
      src.loop = LOOP_AUDIO;
      src.connect(ctx.destination); // direct: no effects on the audio
      audioStartTimeRef.current = ctx.currentTime;
      src.start();
      src.onended = () => {
        if (!LOOP_AUDIO) {
          stopRenderLoopRef.current?.();
          setStatus("ended");
        }
      };
      sourceRef.current = src;

      // Drive the animation from audio playback time.
      startRenderLoopRef.current?.(
        () => (ctx!.currentTime - audioStartTimeRef.current) * 1000,
      );
      setStatus("playing");
    } catch (e) {
      console.error("Failed to start sound reactor", e);
      setStatus("idle");
    }
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const circles = buildCircles();

    // --- Offscreen 2D canvas that becomes the plate texture ---
    // Add STROKE_WIDTH of padding so the outer stroke is never clipped.
    const texSize = CIRCLE_SIZE + STROKE_WIDTH;
    const texCanvas = document.createElement("canvas");
    texCanvas.width = texSize;
    texCanvas.height = texSize;
    const tctx = texCanvas.getContext("2d")!;
    const center = texSize / 2;

    const texture = new THREE.CanvasTexture(texCanvas);
    texture.anisotropy = 4;
    texture.colorSpace = THREE.SRGBColorSpace;

    // Per-circle timeline: fade in -> hold -> fade out.
    const perCircleMs = 2 * ANIMATION_FADE_MS + ANIMATION_HOLD_MS;

    // Active animation range (circle indices, 0 = outermost).
    // ANIMATION_LOOP_TO = -1 means "up to the innermost circle".
    const loopFrom = Math.max(
      0,
      Math.min(ANIMATION_LOOP_FROM, circles.length - 1),
    );
    const loopTo =
      ANIMATION_LOOP_TO < 0
        ? circles.length - 1
        : Math.max(loopFrom, Math.min(ANIMATION_LOOP_TO, circles.length - 1));
    const activeCount = loopTo - loopFrom + 1;

    /**
     * Redraw the plate for a given elapsed time (ms).
     *
     * Sound-reactive model:
     * - `analysisRef` holds a precomputed timeline of "chain starts", each with a
     *   peak strength in [0.15, 1.00] (dB -> strength, see computeAnalysis).
     * - Each chain start re-triggers the staggered circle chain from the start:
     *   a chain at time T fires circle `orderIndex` at T + orderIndex*DELAY with
     *   a 0 -> S -> S -> 0 envelope (fade/hold/fade), S = the chain's peak.
     * - Chain starts come from detected onsets (significant dB increases), with
     *   RESTART_ANIMATION_AFTER_MS as a fallback when no onset occurs.
     * - When a new fade-in starts while a previous fade-out is still running, the
     *   overlap takes the MAX opacity of the two transitions.
     */
    const drawCircles = (elapsed: number) => {
      tctx.clearRect(0, 0, texSize, texSize);

      // Sound-reactive mode needs the precomputed analysis; until then the plate
      // stays empty (the CSS backdrop shows through).
      const analysis = analysisRef.current;
      if (IS_ANIMATING && !analysis) {
        texture.needsUpdate = true;
        return;
      }

      for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        let alpha: number;
        if (!IS_ANIMATING) {
          alpha = 1; // static showcase: all circles at full opacity
        } else {
          // Circles outside the active loop range are left hidden.
          if (i < loopFrom || i > loopTo) {
            continue;
          }
          const posInRange = i - loopFrom;
          // Stagger order: outer -> inner, or inner -> outer when reversed.
          const orderIndex = IS_FROM_OUTER_TO_INNER
            ? posInRange
            : activeCount - 1 - posInRange;

          // Chains whose fire window (T + orderIndex*DELAY) overlaps `elapsed`.
          const lo = elapsed - perCircleMs - orderIndex * DELAY;
          const hi = elapsed - orderIndex * DELAY;
          const chainStarts = analysis!.chainStarts;
          alpha = 0;
          // Binary search the first chain start >= lo, then scan forward.
          let l = 0;
          let r = chainStarts.length;
          while (l < r) {
            const m = (l + r) >> 1;
            if (chainStarts[m].time < lo) l = m + 1;
            else r = m;
          }
          for (let k = l; k < chainStarts.length; k++) {
            const cs = chainStarts[k];
            if (cs.time > hi) break;
            const local = elapsed - (cs.time + orderIndex * DELAY); // 0..perCircleMs
            if (local < 0 || local > perCircleMs) continue;
            const S = cs.peak;
            let a: number;
            if (local < ANIMATION_FADE_MS) {
              a = (local / ANIMATION_FADE_MS) * S; // fade in (0 -> S)
            } else if (local < ANIMATION_FADE_MS + ANIMATION_HOLD_MS) {
              a = S; // hold
            } else {
              a =
                S *
                (1 -
                  (local - ANIMATION_FADE_MS - ANIMATION_HOLD_MS) /
                    ANIMATION_FADE_MS); // fade out (S -> 0)
            }
            if (a > alpha) alpha = a; // overlap blending: take the max
          }
        }
        if (alpha <= 0) continue;

        const radius = c.diameter / 2;

        tctx.save();
        tctx.globalAlpha = alpha;
        tctx.lineWidth = STROKE_WIDTH;
        tctx.strokeStyle = i % 2 === 0 ? "#ffffff" : "#ffffff80";
        tctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#ffffff80";
        tctx.beginPath();
        tctx.arc(center, center, radius, 0, Math.PI * 2);
        if (c.filled) {
          tctx.fill();
        } else {
          tctx.stroke();
        }
        tctx.restore();
      }

      texture.needsUpdate = true;
    };

    // --- Three.js scene ---
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 5000);
    camera.position.set(0, CAMERA_VIEWPOINT, VIEWPOINT_DISTANCE_Z);
    camera.lookAt(0, CAMERA_TARGET, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true, // transparent so the CSS backdrop shows through
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // The 2D plate laid flat on the xz-plane (the "house floor").
    const planeGeo = new THREE.PlaneGeometry(
      CIRCLE_SIZE,
      CIRCLE_SIZE,
      PLANE_SEGMENTS,
      PLANE_SEGMENTS,
    );

    // "Smiley" concave bowl: dip the center DOWN (world -Y) so the circle area's
    // cross-section forms a smile/concave curve. Only the circle area is affected —
    // vertices outside the circle radius stay flat, so the backdrop and everything
    // beyond the plate are never distorted.
    {
      const pos = planeGeo.attributes.position;
      const radius = CIRCLE_SIZE / 2;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const r = Math.sqrt(x * x + y * y) / radius; // 0 center, 1 at circle edge
        if (r <= 1) {
          // Local -Z maps to world -Y after the -90° X rotation -> dips downward.
          pos.setZ(i, -SMILEY_DEPTH * (1 - r * r));
        }
      }
      pos.needsUpdate = true;
      planeGeo.computeVertexNormals();
    }

    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2; // rotate from xy to xz (lay it down)
    scene.add(plane);

    // --- Resize handling ---
    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    window.addEventListener("resize", handleResize);

    // --- Animation loop, capped at MAX_FPS ---
    const frameInterval = 1000 / MAX_FPS;
    const mountStart = performance.now();
    let raf = 0;
    let running = false;
    let last = performance.now();
    let getElapsed: (() => number) | null = null;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!getElapsed) return;
      const dt = now - last;
      if (dt < frameInterval) return; // throttle to MAX_FPS
      last = now - (dt % frameInterval);
      drawCircles(getElapsed());
      renderer.render(scene, camera);
    };

    // `startRenderLoop` switches the animation's time source. It defaults to a
    // wall-clock clock so the static showcase works; handleStart switches it to
    // audio playback time once the sound reactor starts.
    const startRenderLoop = (fn: () => number) => {
      getElapsed = fn;
      last = performance.now();
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    const stopRenderLoop = () => {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    startRenderLoopRef.current = startRenderLoop;
    stopRenderLoopRef.current = stopRenderLoop;

    // Begin rendering immediately (static showcase, or while waiting for audio).
    startRenderLoop(() => performance.now() - mountStart);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      planeGeo.dispose();
      planeMat.dispose();
      texture.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Stop the audio graph when the page unmounts.
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        try {
          sourceRef.current.onended = null;
          sourceRef.current.stop();
        } catch {
          /* already stopped */
        }
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Backdrop: completely independent of the 3D scene / camera transforms.
          It is a plain CSS background and is never moved by Three.js. */}
      <div
        className={clsx(
          "absolute inset-0 bg-contain bg-center bg-no-repeat",
          "w-[1920px] h-[1600px]",
          "left-[2px] top-[163px]",
          "bg-black",
        )}
        // style={{ backgroundImage: "url('/canvas.jpg')" }}
      />
      {/* WebGL canvas (transparent) sits on top of the backdrop */}
      <div ref={mountRef} className="absolute inset-0 overflow-visible" />

      {status !== "playing" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <button
            onClick={handleStart}
            disabled={status === "loading"}
            className="rounded-full bg-white/90 px-10 py-4 text-lg font-semibold text-black shadow-lg transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
          >
            {status === "loading"
              ? "Loading…"
              : status === "ended"
                ? "Replay"
                : "Start"}
          </button>
        </div>
      )}
    </div>
  );
}
