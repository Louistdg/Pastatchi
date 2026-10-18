import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const file = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("identité T-Bouclier cohérente entre interface et favicon", () => {
  const app = file("../src/App.jsx");
  const symbol = file("../src/TShieldIcon.jsx");
  const favicon = file("../public/favicon.svg");
  assert.match(app, /function Logo\(\)/);
  assert.match(app, /Pasta<strong>T<\/strong>shield/);
  assert.match(app, /TShieldIcon/);
  assert.match(symbol, /viewBox="0 0 40 40"/);
  assert.match(favicon, /T-Bouclier/);
  assert.doesNotMatch(app, /<div className="logo-mark">P<\/div>/);
});

test("palette officielle et styles sémantiques", () => {
  const css = file("../src/design-system.css");
  for (const hex of ["#050914", "#0F172A", "#1E293B", "#2563EB", "#10B981", "#EF4444", "#F59E0B", "#F4F7FB", "#E6ECF5", "#B7C4D6"]) {
    assert.ok(css.toLowerCase().includes(hex.toLowerCase()), "Couleur absente : " + hex);
  }
  assert.match(css, /\.app-shell \.sidebar \.nav-item\.selected/);
  assert.match(css, /border-left: 3px solid var\(--pts-primary\)/);
  assert.match(css, /opacity: (?:0)?\.14 !important/);
  assert.match(css, /\.modules-grid/);
});

test("polices chargées localement sans dépendance Google Fonts", () => {
  const main = file("../src/main.jsx");
  assert.match(main, /@fontsource\/atkinson-hyperlegible-next\/latin-400.css/);
  assert.match(main, /@fontsource\/atkinson-hyperlegible-next\/latin-600.css/);
  assert.doesNotMatch(main, /@fontsource\/inter\//);
  assert.match(main, /@fontsource\/space-grotesk\/latin-600.css/);
  assert.match(main, /@fontsource\/jetbrains-mono\/latin-400.css/);
  assert.match(main, /design-system.css/);
  assert.doesNotMatch(main, /fonts\.googleapis\.com/);
});

test("minuteur de presse-papiers décrit honnêtement la tentative d'effacement", () => {
  const code = file("../src/PasswordManager.jsx");
  assert.match(code, /ClipboardCountdown/);
  assert.match(code, /clipboard-timer-ring/);
  assert.match(code, /navigator\.clipboard\.readText/);
  assert.match(code, /l'historique du système peuvent empêcher son/);
  assert.match(code, /effacement/);
});

function cssToken(name) {
  const css = file("../src/design-system.css");
  const match = css.match(new RegExp(name.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&") + ":\\s*(#[0-9a-fA-F]{6})\\s*;"));
  assert.ok(match, "Missing CSS token: " + name);
  return match[1];
}

function luminance(hex) {
  const channel = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channel.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

test("couleurs de lecture : contraste WCAG AA calculé sur les jetons", () => {
  const white = "#ffffff";
  const primary = cssToken("--pts-primary");
  const hover = cssToken("--pts-primary-hover");
  const surface = cssToken("--pts-surface-1");
  const fg = cssToken("--pts-text");
  const muted = cssToken("--pts-muted");
  assert.ok(contrast(white, primary) >= 4.5, "Texte blanc insuffisant sur bouton principal");
  assert.ok(contrast(white, hover) >= 4.5, "Texte blanc insuffisant sur bouton au survol");
  assert.ok(contrast(fg, surface) >= 4.5, "Contraste du texte courant insuffisant");
  assert.ok(contrast(muted, surface) >= 4.5, "Contraste du texte secondaire insuffisant");
});

test("mise en page lisible : corps 17px, boutons 16px, police Hyperlegible et titres aérés", () => {
  const css = file("../src/design-system.css");
  assert.match(css, /--pts-font-body:\s*"Atkinson Hyperlegible Next"/);
  assert.match(css, /--pts-font-heading:\s*"Atkinson Hyperlegible Next"/);
  assert.match(css, /font-size: 17px;\s*line-height: 27px;/);
  assert.match(css, /\.app-shell \.sidebar \.nav-item\s*\{[\s\S]*?font-size: 16px !important/);
  assert.match(css, /\.app-shell \.hero h1\s*\{[\s\S]*?font-size: 36px !important/);
});
