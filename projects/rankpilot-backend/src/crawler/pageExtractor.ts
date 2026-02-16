import type { Page } from 'playwright';
import type { PageData } from './types.js';

// The function passed to page.evaluate() runs in the browser context.
// We define the extraction script as a string to avoid DOM type conflicts.
const EXTRACTION_SCRIPT = `(baseOrigin) => {
  const getText = (selector) => {
    const el = document.querySelector(selector);
    return el?.textContent?.trim() ?? null;
  };

  const getMeta = (name) => {
    const el = document.querySelector('meta[name="' + name + '"], meta[property="' + name + '"]');
    return el?.content?.trim() ?? null;
  };

  const title = document.title?.trim() ?? null;
  const metaDescription = getMeta('description');

  const h1 = getText('h1');
  const h2Elements = document.querySelectorAll('h2');
  const h2s = Array.from(h2Elements).map((el) => el.textContent?.trim() ?? '');

  const bodyText = document.body?.innerText ?? '';
  const wordCount = bodyText.split(/\\s+/).filter((w) => w.length > 0).length;

  const images = document.querySelectorAll('img');
  const imageCount = images.length;
  let imagesWithoutAlt = 0;
  for (const img of images) {
    if (!img.alt?.trim()) imagesWithoutAlt++;
  }

  const links = document.querySelectorAll('a[href]');
  let internalLinks = 0;
  let externalLinks = 0;
  const internalLinkUrls = [];

  for (const link of links) {
    const href = link.href;
    if (!href) continue;
    try {
      const linkUrl = new URL(href);
      if (linkUrl.origin === baseOrigin) {
        internalLinks++;
        internalLinkUrls.push(linkUrl.pathname + linkUrl.search);
      } else {
        externalLinks++;
      }
    } catch (e) {}
  }

  const canonicalEl = document.querySelector('link[rel="canonical"]');
  const canonicalUrl = canonicalEl?.href ?? null;

  const ogTags = {};
  const ogMetas = document.querySelectorAll('meta[property^="og:"]');
  for (const meta of ogMetas) {
    const property = meta.getAttribute('property');
    const content = meta.content;
    if (property && content) ogTags[property] = content;
  }

  const structuredData = [];
  const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of ldScripts) {
    try {
      structuredData.push(JSON.parse(script.textContent ?? ''));
    } catch (e) {}
  }

  const viewportMeta = document.querySelector('meta[name="viewport"]');
  const hasViewportMeta = viewportMeta !== null;

  const robotsMeta = getMeta('robots');
  const isIndexable = !robotsMeta || !(/noindex/i).exec(robotsMeta);

  return {
    url: window.location.href,
    title,
    metaDescription,
    h1,
    h2s,
    wordCount,
    imageCount,
    imagesWithoutAlt,
    internalLinks,
    externalLinks,
    canonicalUrl,
    ogTags,
    structuredData,
    hasViewportMeta,
    isIndexable: !!isIndexable,
    internalLinkUrls,
  };
}`;

export async function extractPageData(
  page: Page,
  baseUrl: URL,
): Promise<Omit<PageData, 'httpStatus' | 'redirectChain'>> {
  const fn = new Function('return ' + EXTRACTION_SCRIPT)();
  return page.evaluate(fn, baseUrl.origin);
}
