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
  for (const hex of ["#050914", "#0F172A", "#1E293B", "#3B82F6", "#10B981", "#EF4444", "#F59E0B", "#F4F7FB", "#E6ECF5", "#9AA7B8"]) {
    assert.ok(css.toLowerCase().includes(hex.toLowerCase()), "Couleur absente : " + hex);
  }
  assert.match(css, /\.app-shell \.sidebar \.nav-item\.selected/);
  assert.match(css, /border-left: 3px solid var\(--pts-primary\)/);
  assert.match(css, /opacity: (?:0)?\.14 !important/);
  assert.match(css, /\.modules-grid/);
});

test("polices chargées localement sans dépendance Google Fonts", () => {
  const main = file("../src/main.jsx");
  assert.match(main, /@fontsource\/inter\/latin-400.css/);
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
