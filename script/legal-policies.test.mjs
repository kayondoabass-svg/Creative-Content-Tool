import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// JSX source wraps prose over lines; checks concern the rendered wording, not wrapping.
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\s+/g, " ");
const privacy = read("client/src/pages/legal/privacy-policy.tsx");
const terms = read("client/src/pages/legal/terms-and-conditions.tsx");
const refunds = read("client/src/pages/legal/refund-information.tsx");
const layout = read("client/src/components/legal-document.tsx");
const review = read("docs/legal-policy-review.md");
const regions = read("client/src/pages/legal/regional-notices.tsx");

test("existing public legal routes resolve to updated document entrypoints", () => {
  const app = read("client/src/App.tsx");
  for (const [route, file] of [["privacy", "privacy-policy"], ["terms", "terms-and-conditions"], ["refund", "refund-information"]]) {
    assert.match(app, new RegExp(`path="/${route}"`));
    assert.match(read(`client/src/pages/${route}.tsx`), new RegExp(`./legal/${file}`));
  }
});

test("documents share confirmed operator details and an honest publication notice", () => {
  assert.match(layout, /Last updated:/);
  assert.match(layout, /applies when published/);
  assert.doesNotMatch(layout, /Review draft — not yet effective/);
  assert.match(layout, /not legal advice/);
  assert.match(layout, /8 November 2026/);
  assert.match(layout, /Keyo Technologies/);
  assert.match(layout, /Kampala, Uganda/);
  assert.match(layout, /SHAMBA COMPLEX P44, William Street, Kampala, Uganda/);
  for (const document of [privacy, terms, refunds]) {
    assert.match(document, /legalOperator/);
  }
  assert.doesNotMatch(privacy + terms + refunds, /Kayondo Abass|\[confirmed legal operator/);
});

test("privacy distinguishes current providers, local processing and multiple retention classes", () => {
  assert.match(privacy, /Cloudflare Web Analytics/);
  for (const word of ["Google Gemini", "PesaPal", "Cloudflare", "AfroAI", "DigitalOcean", "Ahrefs", "GitHub"]) {
    assert.ok(privacy.includes(word), `Missing recipient: ${word}`);
  }
  for (const word of ["24 hours", "Local/offline", "Logs and backups", "not deletion", "OpenAI-compatible"]) {
    assert.ok(privacy.includes(word), `Missing processing distinction: ${word}`);
  }
});

test("GDPR notice includes lawful bases, transfers, rights, source and request deadlines", () => {
  for (const word of ["Legitimate interests", "Consent", "Chapter V", "one month",
    "two further months", "restriction", "portability", "direct marketing",
    "data protection authority", "invitation email", "Article 8"]) {
    assert.ok(privacy.includes(word), `Missing privacy topic: ${word}`);
  }
});

test("consumer terms preserve withdrawal, conformity rights and open-source licences", () => {
  for (const word of ["14 days", "express prior consent", "proportionate charge",
    "non-waivable", "lawful", "open-source", "machine-readable"]) {
    assert.ok(terms.includes(word), `Missing terms safeguard: ${word}`);
  }
  assert.match(refunds, /Model withdrawal form/);
  assert.match(refunds, /only if this form is notified on paper/);
  assert.match(refunds, /does not automatically remove the right/);
});

test("documents do not certify unfinished tracking, AI or archive automation", () => {
  assert.match(privacy, /No working consent-management interface/);
  assert.match(terms, /does not claim that automatic provenance/);
  assert.match(review, /scheduled archiving, rotation and a fixed expiry have not been verified/);
  assert.match(review, /SGR/);
  assert.match(review, /19 June 2026/);
  assert.match(review, /2 August 2026/);
  assert.match(review, /11 September 2026/);
});

test("legal pages have related-page and support links", () => {
  for (const route of ["/privacy", "/terms", "/refund"]) {
    assert.ok(layout.includes(`href="${route}"`));
  }
  assert.match(layout, /support@brightboardapp\.com/);
  assert.match(layout, /mailto:/);
  assert.match(layout, /aria-label=.*contents/);
});

test("regional coverage is broader than EU and uses conditional national applicability", () => {
  for (const region of ["Uganda", "African", "ASEAN", "GCC", "China", "Australia",
    "United States", "Canada", "Mexico", "South America", "United Kingdom"]) {
    assert.ok(regions.includes(region), `Missing regional coverage: ${region}`);
  }
  for (const framework of ["PIPL", "POPIA", "CCPA", "CASL", "LGPD", "PDPA"]) {
    assert.ok(regions.includes(framework), `Missing framework: ${framework}`);
  }
  assert.match(regions, /qualifying thresholds/);
  assert.match(regions, /not a country-by-country legal opinion or proof of worldwide compliance/);
  assert.match(regions, /do not have to create a BrightBoard account/);
  assert.match(privacy, /RegionalPrivacyNotices/);
  assert.match(terms, /MandatoryLocalRights/);
});

test("regional notes distinguish future law from current AI and child-data obligations", () => {
  assert.match(regions, /Chile.*1 December 2026/);
  assert.match(regions, /not be represented as already fully operative/);
  assert.match(regions, /children under 14/);
  assert.match(regions, /1 September 2025/);
  assert.match(regions, /30 days/);
});

test("refund information preserves non-EU statutory rights and differing periods", () => {
  for (const word of ["United Kingdom", "Australia", "Brazil", "seven-day",
    "North/South American", "ASEAN", "GCC", "China"]) {
    assert.ok(refunds.includes(word), `Missing regional refund protection: ${word}`);
  }
  assert.match(refunds, /not a worldwide limitation/);
});
