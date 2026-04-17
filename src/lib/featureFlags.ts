/**
 * Feature flags — flip these to enable/disable entire features without code
 * changes. In production you'd wire these to a remote config service; for now
 * a simple boolean export is enough to give a single kill-switch per feature.
 */

/** Master switch for the Posts feature (compose, view, profile section). */
export const POSTS_ENABLED = true
