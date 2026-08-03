/**
 * Netlify Blobs is the site-scoped key/value store Netlify Functions get for
 * free — no database to provision, no extra environment variables. It works
 * the same way whether the site was deployed from Git or dropped as a zip,
 * because the store is tied to the Netlify site itself, not the deploy
 * method.
 *
 * Used to remember which intakes started (screen 1 submitted) but never
 * finished, so send-intake-reminders.mjs can nudge those clients later.
 */
import { getStore } from '@netlify/blobs';

export function intakeProgressStore() {
  return getStore('intake-progress');
}
