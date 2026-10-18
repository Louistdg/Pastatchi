import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeOfficialSearch, searchOfficialSites } from "../src/officialSearch.js";

const catalog = JSON.parse(readFileSync(new URL("../../backend/app/official_sites_frbe.json", import.meta.url), "utf8"));
const ids = (results) => results.sites.map((site) => site.id);

test("catalogue : 24 adresses documentées France/Belgique en HTTPS", () => {
  assert.equal(catalog.sites.length, 24);
  assert.equal(catalog.reviewed_on, "2026-10-18");
  assert.equal(new Set(catalog.sites.map((site) => site.id)).size, 24);
  for (const site of catalog.sites) {
    assert.ok(site.url.startsWith("https://"));
    assert.ok(site.source_url.startsWith("https://"));
    assert.ok(site.keywords.length > 0);
  }
});

test("recherche sans accents et avec filtre pays", () => {
  assert.equal(normalizeOfficialSearch("SÉCURITÉ SOCIALE"), "securite sociale");
  assert.ok(ids(searchOfficialSites(catalog.sites, "impôts", "France")).includes("impots"));
  assert.ok(!ids(searchOfficialSites(catalog.sites, "impôts", "France")).includes("myminfin"));
  assert.ok(ids(searchOfficialSites(catalog.sites, "IMPOTS", "Belgique")).includes("myminfin"));
  assert.equal(searchOfficialSites(catalog.sites, "", "France").sites.length, 12);
  assert.equal(searchOfficialSites(catalog.sites, "", "Belgique").sites.length, 12);
});

test("recherche multi-mots et contenu local uniquement", () => {
  const results = searchOfficialSites(catalog.sites, "suivi colis", "France");
  assert.ok(ids(results).includes("colissimo"));
  const source = readFileSync(new URL("../src/OfficialSitesDirectory.jsx", import.meta.url), "utf8");
  assert.match(source, /api\("\/api\/v1\/official-sites"\)/);
  assert.doesNotMatch(source, /googleapis|google\.com\/search|search\.google|fetch\(.*query/);
});

test("faute de frappe : amelie propose ameli sans prendre la décision pour l'utilisateur", () => {
  const results = searchOfficialSites(catalog.sites, "amelie");
  assert.equal(results.sites.length, 0);
  assert.deepEqual(results.suggestion, { query: "ameli", siteId: "ameli" });
  assert.equal(searchOfficialSites(catalog.sites, "aucunorganisme123").sites.length, 0);
});

test("aucune affirmation de sécurité garantie et copie sans expiration", () => {
  const source = readFileSync(new URL("../src/OfficialSitesDirectory.jsx", import.meta.url), "utf8");
  assert.match(source, /ne sont pas contrôlées en direct/);
  assert.match(source, /ne garantit pas que le site est sans[\s\S]*?faille/);
  assert.match(source, /navigator\.clipboard\.writeText\(site\.url\)/);
  assert.doesNotMatch(source, /setTimeout\(|clipboard\.writeText\(""\)/);
  assert.match(source, /rel="noopener noreferrer"/);
});
