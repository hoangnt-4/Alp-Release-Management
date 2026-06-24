/**
 * Feature flags — controlled by VITE_APP_VERSION env var.
 *
 * Versions:
 *   1.0.0  — baseline (no Monet)
 *   1.0.1  — Monet tab + dot indicators + Priority badge
 *
 * Usage:
 *   import { FEATURES } from '../lib/features'
 *   if (FEATURES.monet) { ... }
 */

function semverGte(version, min) {
  const parse = v => v.split('.').map(Number)
  const [ma, mi, pa] = parse(version)
  const [ma2, mi2, pa2] = parse(min)
  if (ma !== ma2) return ma > ma2
  if (mi !== mi2) return mi > mi2
  return pa >= pa2
}

const VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0'

export const FEATURES = {
  monet: semverGte(VERSION, '1.0.1'),
}

// Shared constants
export const REVIEWER_OPTIONS  = ['Hieu', 'Hoa Nguyen', 'Tuan Hoang']
export const DEFAULT_REVIEWER  = 'Hieu'
export const DEFAULT_STATUS    = 'Checked'
