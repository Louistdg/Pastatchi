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
  assert.match(main, /@fontsource\/lexend\/latin-400.css/);
  assert.match(main, /@fontsource\/lexend\/latin-600.css/);
  assert.doesNotMatch(main, /@fontsource\/inter\//);
  assert.doesNotMatch(main, /@fontsource\/atkinson-hyperlegible-next\//);
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

test("contrastes essentiels des jetons principaux et des statuts", () => {
  const white = "#ffffff";
  const primary = cssToken("--pts-primary");
  const hover = cssToken("--pts-primary-hover");
  const surface = cssToken("--pts-surface-1");
  const fg = cssToken("--pts-text");
  const muted = cssToken("--pts-muted");
  const successText = cssToken("--pts-success-text");
  const dangerText = cssToken("--pts-danger-text");
  const warningText = cssToken("--pts-warning-text");
  assert.ok(contrast(white, primary) >= 4.5, "Texte blanc insuffisant sur bouton principal");
  assert.ok(contrast(white, hover) >= 4.5, "Texte blanc insuffisant sur bouton au survol");
  assert.ok(contrast(fg, surface) >= 4.5, "Contraste du texte courant insuffisant");
  assert.ok(contrast(muted, surface) >= 4.5, "Contraste du texte secondaire insuffisant");
  assert.ok(contrast(successText, surface) >= 4.5, "Texte succès insuffisant");
  assert.ok(contrast(dangerText, surface) >= 4.5, "Texte danger insuffisant");
  assert.ok(contrast(warningText, surface) >= 4.5, "Texte avertissement insuffisant");
});

test("mise en page lisible : corps 17px, boutons 16px, Lexend et titres aérés", () => {
  const css = file("../src/design-system.css");
  assert.match(css, /--pts-font-body:\s*"Lexend"/);
  assert.match(css, /--pts-font-heading:\s*"Lexend"/);
  assert.match(css, /font-size: 17px;\s*line-height: 27px;/);
  assert.match(css, /\.app-shell \.sidebar \.nav-item\s*\{[\s\S]*?font-size: 16px !important/);
  assert.match(css, /\.app-shell \.hero h1\s*\{[\s\S]*?font-size: 36px !important/);
});

test("aucune police Inter ou Atkinson dans les actifs frontaux et les dépendances", () => {
  const main = file("../src/main.jsx");
  const css = file("../src/design-system.css");
  const old = file("../src/styles.css");
  const pkg = file("../package.json");
  const lock = file("../package-lock.json");
  for (const [filename, contents] of [["main.jsx", main], ["design-system.css", css], ["styles.css", old]]) {
    assert.doesNotMatch(contents, /\b(?:Inter|Atkinson Hyperlegible Next)\b|@fontsource\/(?:inter|atkinson-hyperlegible-next)\//i, filename);
  }
  assert.ok(pkg.includes("@fontsource/lexend"), "Lexend absent des dépendances");
  assert.ok(!pkg.includes("@fontsource/inter"), "Inter encore déclaré");
  assert.ok(!pkg.includes("@fontsource/atkinson-hyperlegible-next"), "Atkinson encore déclaré");
  assert.ok(!lock.includes("node_modules/@fontsource/inter"), "Inter encore dans le lockfile");
  assert.ok(!lock.includes("node_modules/@fontsource/atkinson-hyperlegible-next"), "Atkinson encore dans le lockfile");
});

test("statuts en texte contrasté, focus et mouvement réduit", () => {
  const css = file("../src/design-system.css");
  for (const token of ["success-text", "danger-text", "warning-text"]) {
    assert.ok(css.includes("var(--pts-" + token + ")"), "Variante de statut manquante : " + token);
  }
  assert.match(css, /\.app-shell \*:focus-visible\s*\{/);
  assert.match(css, /outline:\s*3px solid #60a5fa !important/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /scroll-behavior:\s*auto !important/);
});

test("rapport faible : ne suggère pas une réputation externe vérifiée", () => {
  const app = file("../src/App.jsx");
  const messages = app.match(/const messages = \{[\s\S]*?\n  \};/);
  assert.ok(messages);
  assert.match(messages[0], /AUCUN INDICE MAJEUR DÉTECTÉ/);
  assert.match(messages[0], /Cela ne prouve pas que ce contenu est sans danger/);
  assert.doesNotMatch(messages[0], /AUCUN SIGNALEMENT CONNU DÉTECTÉ/);
});

test("icônes de statut et focus : contraste non textuel WCAG d'au moins 3:1 sur les surfaces", () => {
  const surfaces = [cssToken("--pts-surface-1"), cssToken("--pts-surface-2")];
  const iconColors = [
    cssToken("--pts-success"),
    cssToken("--pts-danger"),
    cssToken("--pts-warning"),
    "#60a5fa", // contour focus
  ];
  for (const surface of surfaces) {
    for (const color of iconColors) {
      assert.ok(contrast(color, surface) >= 3,
        "Contraste d'icône/focus insuffisant (" + color + " sur " + surface + ")");
    }
  }
});
