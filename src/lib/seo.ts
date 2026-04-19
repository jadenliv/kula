/**
 * Minimal SEO utilities for a SPA.
 * Call setTitle() in page components via useEffect to update the browser tab
 * and any dynamic crawlers that execute JavaScript.
 */

const SITE_NAME = 'Kula'

/** Set the document title. Appends "— Kula" unless it's the landing page. */
export function setTitle(pageTitle?: string) {
  document.title = pageTitle
    ? `${pageTitle} — ${SITE_NAME}`
    : `${SITE_NAME} — A companion for your learning`
}
