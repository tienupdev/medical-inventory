"use client";

import clsx from "clsx";
import { useEffect, useRef } from "react";
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

export default function CanvasPage() {
  const mountRef = useRef<HTMLDivElement>(null);

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
     * Each active circle fades in (ANIMATION_FADE_MS), holds at full opacity
     * (ANIMATION_HOLD_MS), then fades out (ANIMATION_FADE_MS), staggered by
     * DELAY in the configured order.
     *
     * Each circle restarts INDEPENDENTLY RESTART_ANIMATION_AFTER_MS after its
     * own start time — so an early circle restarts even while a later circle is
     * still mid-animation. A circle is hidden during the idle window between the
     * end of its timeline (perCircleMs) and its next restart.
     */
    const drawCircles = (elapsed: number) => {
      tctx.clearRect(0, 0, texSize, texSize);

      for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        let alpha: number;
        if (!IS_ANIMATING) {
          alpha = 1; // show all circles in full (no animation)
        } else {
          // Circles outside the active loop range are left hidden.
          if (i < loopFrom || i > loopTo) {
            continue;
          }
          // Position within the active range (0 = first to animate).
          const posInRange = i - loopFrom;
          // Stagger order: outer -> inner, or inner -> outer when reversed.
          const orderIndex = IS_FROM_OUTER_TO_INNER
            ? posInRange
            : activeCount - 1 - posInRange;
          const baseStart = orderIndex * DELAY;
          const delta = elapsed - baseStart; // ms since this circle first started
          alpha = 0;
          if (delta >= 0) {
            // Each circle restarts independently every RESTART_ANIMATION_AFTER_MS.
            const local = delta % RESTART_ANIMATION_AFTER_MS;
            if (local < ANIMATION_FADE_MS) {
              // Phase 1: fade in (0 -> 1)
              alpha = local / ANIMATION_FADE_MS;
            } else if (local < ANIMATION_FADE_MS + ANIMATION_HOLD_MS) {
              // Phase 2: hold at full opacity (1)
              alpha = 1;
            } else if (local < perCircleMs) {
              // Phase 3: fade out (1 -> 0)
              alpha =
                1 -
                (local - ANIMATION_FADE_MS - ANIMATION_HOLD_MS) /
                  ANIMATION_FADE_MS;
            }
            // else: idle window (perCircleMs..RESTART) -> alpha stays 0 until restart
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
    };
    window.addEventListener("resize", handleResize);

    // --- Animation loop, capped at MAX_FPS ---
    const frameInterval = 1000 / MAX_FPS;
    let raf = 0;
    let last = performance.now();
    const startTime = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const elapsed = now - last;
      if (elapsed < frameInterval) return; // throttle to MAX_FPS
      last = now - (elapsed % frameInterval);

      drawCircles(now - startTime);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

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
        style={{ backgroundImage: "url('/canvas.jpg')" }}
      />
      {/* WebGL canvas (transparent) sits on top of the backdrop */}
      <div ref={mountRef} className="absolute inset-0 overflow-visible" />
    </div>
  );
}
