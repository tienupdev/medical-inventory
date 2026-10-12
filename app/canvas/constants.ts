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
export const ANIMATION_LOOP_FROM = 26; /// 26 // 14 // 08 // 02
export const ANIMATION_LOOP_TO = -1; ///// -1 // 25 // 13 // 08
