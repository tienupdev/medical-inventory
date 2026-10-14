"use client";

// --- export constants ---
export const MAX_FPS = 60; // cap the render loop at 60 frames per second

export const CIRCLE_SIZE = 1920; // px diameter of the outer (largest) circle
export const STROKE_WIDTH = 15; // white stroke width for every stroked circle
export const ANIMATION_FADE_MS = 200; // fade-in / fade-out duration per circle
export const ANIMATION_HOLD_MS = 100; // hold at full opacity before fading out

export const RESTART_ANIMATION_AFTER_MS = 600;

export const DELAY = 50; // ms stagger between consecutive circles (outer -> inner)

export const CAMERA_VIEWPOINT = 560; // camera Y position (height above the xz floor)
export const CAMERA_TARGET = 95; // camera Y position (height above the xz floor)
export const VIEWPOINT_DISTANCE_Z = -2080; // camera Z (negative so the plate is visible)

// --- "Smiley" concave bowl distortion (circle area only) ---
export const SMILEY_DEPTH = 90; // max downward dip at the plate center (world -Y)
export const PLANE_SEGMENTS = 64; // plate subdivisions so the concave bowl is smooth
export const RING_SIZE = STROKE_WIDTH * 3; // distance between consecutive stroked circles
export const MINIMUM_CIRCLE_SIZE = 100;
export const IS_ANIMATING = true; // if false, show all circles at full opacity (no fade)
export const IS_FROM_OUTER_TO_INNER = false; // if false, animate from inner to outer
// Animation plays only within this circle index range (0 = outermost).
// ANIMATION_LOOP_TO = -1 means "up to the innermost circle".
export const ANIMATION_LOOP_FROM = 27; /// 27 // 12 // 03
export const ANIMATION_LOOP_TO = -1; ///// -1 // 25 // 11

// --- Sound reactor ---
// The input is band-limited (1-3kHz) for sharper peak detection, so absolute dB
// levels are low. We therefore normalize the dB curve to the TRACK'S OWN dynamic
// range (percentiles) — no absolute dB thresholds are used. This keeps the
// strength mapping and onset detection correct regardless of band-limiting.
// Analysis is fully offline (no effects are applied to the audible audio).
export const ANALYSIS_HOP_SAMPLES = 512; // analysis frame hop (samples)
export const ANALYSIS_WINDOW_SAMPLES = 1024; // analysis frame window (samples)

// dB -> "strength" mapping (normalized to the track's dynamic range):
//   dB at STRENGTH_CEIL_PERCENTILE  -> MAX_OPACITY
//   dB at STRENGTH_FLOOR_PERCENTILE -> MIN_OPACITY
//   in between -> linear; clamped to [MIN_OPACITY, MAX_OPACITY].
export const STRENGTH_CEIL_PERCENTILE = 0.95; // bright percentile -> max strength
export const STRENGTH_FLOOR_PERCENTILE = 0.20; // quiet percentile (noise floor) -> min
export const MIN_OPACITY = 0.15; // min strength (quiet parts)
export const MAX_OPACITY = 1.0; // max strength (loud parts)

// An "onset" is a significant dB increasing point. The rise threshold is
// RELATIVE (scale-invariant), so it works on band-limited signals. The floor is
// also relative: ONSET_DB_FLOOR_MARGIN dB above the noise-floor percentile, so
// noise-level fluctuations never trigger false onsets.
export const ONSET_WINDOW_MS = 50; // window over which a dB rise is measured
export const ONSET_DB_RISE = 4; // dB rise over the window to count as significant
export const ONSET_MIN_GAP_MS = 80; // min gap between consecutive onsets
export const ONSET_DB_FLOOR_MARGIN = 3; // dB above floor percentile to count as "signal"
export const ONSET_PEAK_WINDOW_MS = 150; // look-ahead after an onset to record its peak

export const LOOP_AUDIO = true; // loop the audio so the reactor keeps running
