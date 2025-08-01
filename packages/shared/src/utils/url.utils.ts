// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * URL regex pattern to match various URL formats
 * Matches http:// or https:// followed by domain and optional path
 */
export const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

/**
 * Extracts all URLs from a given text string
 * @param text - The text to extract URLs from
 * @returns Array of URL strings found in the text
 */
export function extractUrls(text: string): string[] {
  if (!text) {
    return [];
  }

  const matches = [...text.matchAll(URL_REGEX)];
  return matches.map((match) => match[0]);
}

/**
 * Extracts unique URLs with their domain names from text
 * @param text - The text to extract URLs from
 * @returns Array of objects containing URL and domain
 */
export function extractUrlsWithDomains(text: string): { url: string; domain: string }[] {
  if (!text) {
    return [];
  }

  const urls = extractUrls(text);
  const uniqueUrls = new Map<string, { url: string; domain: string }>();

  urls.forEach((url) => {
    if (!uniqueUrls.has(url)) {
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        uniqueUrls.set(url, { url, domain });
      } catch {
        // Invalid URL, skip it
      }
    }
  });

  return Array.from(uniqueUrls.values());
}
