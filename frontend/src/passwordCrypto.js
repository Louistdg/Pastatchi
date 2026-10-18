/* PastaTshield — cryptographie du coffre, exclusivement dans le navigateur.
   WebCrypto AES-GCM + PBKDF2-SHA256. Ne jamais envoyer les secrets à FastAPI. */
import { wordlist as frenchWords } from "@scure/bip39/wordlists/french.js";

export const VAULT_IDLE_MS = 5 * 60 * 1000;
export const KDF_ITERATIONS = 600000;

function secureRandom(size) {
  const a = new Uint8Array(size);
  globalThis.crypto.getRandomValues(a);
  return a;
}

function randomBelow(limit) {
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 0xffffffff) {
    throw new Error("Intervalle aléatoire invalide.");
  }
  const range = 0x100000000;
  const threshold = Math.floor(range / limit) * limit;
  const sample = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(sample);
  } while (sample[0] >= threshold);
  return sample[0] % limit;
}

export function generatePassword(length = 20) {
  if (!Number.isInteger(length) || length < 16 || length > 64)
    throw Error("Longueur de 16 à 64 caractères.");
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnpqrstuvwxyz",
    "23456789",
    "!@#$%*+-_?",
  ];
  const alphabet = groups.join("");
  const letters = groups.map((g) => g[randomBelow(g.length)]);
  while (letters.length < length)
    letters.push(alphabet[randomBelow(alphabet.length)]);
  for (let i = letters.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters.join("");
}

export function generatePassphrase(count = 7) {
  // 2048 mots français ; 7 choix uniformes = 77 bits d'entropie nominale.
  if (!Number.isInteger(count) || count < 6 || count > 10)
    throw Error("Entre 6 et 10 mots requis.");
  return Array.from(
    { length: count },
    () => frenchWords[randomBelow(frenchWords.length)],
  ).join("-");
}

export function estimateStrength(secret) {
  if (!secret)
    return {
      label: "Non renseigné",
      level: 0,
      advice: "Créez un mot de passe unique.",
    };
  const value = secret.trim();
  if (value.length < 12)
    return {
      label: "Faible",
      level: 1,
      advice: "Utilisez au moins 16 caractères ou une longue phrase aléatoire.",
    };
  if (
    /^(.)\1{5,}$/.test(value) ||
    /password|motdepasse|azerty|qwerty|123456|admin|bienvenue/i.test(value)
  ) {
    return {
      label: "Faible",
      level: 1,
      advice: "Évitez les expressions connues et les suites faciles à deviner.",
    };
  }
  const categories = [
    /[a-zà-ÿ]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^\p{L}\p{N}\s]/u.test(value),
  ].filter(Boolean).length;
  if (value.length >= 18 && categories >= 3)
    return {
      label: "Fort (estimation)",
      level: 3,
      advice:
        "Bonne longueur apparente. Vérifiez qu'il est unique et non prévisible.",
    };
  if (value.length >= 30)
    return {
      label: "Fort (estimation)",
      level: 3,
      advice:
        "Longue phrase : évitez les phrases célèbres ou déjà utilisées ailleurs.",
    };
  return {
    label: "Moyen",
    level: 2,
    advice: "Allongez ce mot de passe et évitez de le réutiliser.",
  };
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(a) {
  let binary = "";
  for (let i = 0; i < a.length; i += 8192)
    binary += String.fromCharCode(...a.subarray(i, i + 8192));
  return btoa(binary);
}
function fromB64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function derive(secret, salt, iterations) {
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function aesEncrypt(bytes, key) {
  const iv = secureRandom(12);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
  return { iv: toB64(iv), data: toB64(new Uint8Array(data)) };
}
async function aesDecrypt(payload, key) {
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(payload.iv) },
      key,
      fromB64(payload.data),
    ),
  );
}

async function wrapDataKey(secret, rawKey) {
  const salt = secureRandom(16);
  const kdf = {
    algorithm: "PBKDF2-SHA256",
    iterations: KDF_ITERATIONS,
    salt: toB64(salt),
  };
  const wrapper = await derive(secret, salt, KDF_ITERATIONS);
  return { kdf, wrapped: await aesEncrypt(rawKey, wrapper) };
}

async function unwrapDataKey(secret, kdf, wrapped) {
  const wrapper = await derive(secret, fromB64(kdf.salt), kdf.iterations);
  const decrypted = await aesDecrypt(wrapped, wrapper);
  if (decrypted.length !== 32) throw Error("Clé de coffre invalide.");
  return decrypted;
}

function recoverySecret() {
  // 256 bits secrets. Affiché une seule fois ; garder hors du navigateur.
  const bytes = secureRandom(32);
  return toB64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createVault(master) {
  if (master.trim().length < 16)
    throw Error("Choisissez une phrase maître d'au moins 16 caractères.");
  const dataKey = secureRandom(32);
  const rescue = recoverySecret();
  const main = await wrapDataKey(master, dataKey);
  const backup = await wrapDataKey(rescue, dataKey);
  const key = await crypto.subtle.importKey("raw", dataKey, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  const content = await aesEncrypt(
    enc.encode(JSON.stringify({ entries: [] })),
    key,
  );
  const envelope = {
    format: 1,
    kdf: main.kdf,
    wrapped_key: main.wrapped,
    recovery_kdf: backup.kdf,
    recovery_wrapped_key: backup.wrapped,
    content,
  };
  dataKey.fill(0);
  return { envelope, key, rescue };
}

export async function openVault(envelope, secret, recovery = false) {
  try {
    const raw = await unwrapDataKey(
      secret,
      recovery ? envelope.recovery_kdf : envelope.kdf,
      recovery ? envelope.recovery_wrapped_key : envelope.wrapped_key,
    );
    const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
    raw.fill(0);
    const cleartext = await aesDecrypt(envelope.content, key);
    const value = JSON.parse(dec.decode(cleartext));
    cleartext.fill(0);
    if (!value || !Array.isArray(value.entries))
      throw Error("Contenu du coffre invalide.");
    return { key, entries: value.entries };
  } catch {
    throw Error(
      recovery
        ? "Clé de secours incorrecte ou coffre endommagé."
        : "Phrase maître incorrecte ou coffre endommagé.",
    );
  }
}

export async function encryptEntries(envelope, key, entries) {
  if (!Array.isArray(entries) || entries.length > 100)
    throw Error("Le coffre alpha accepte jusqu'à 100 entrées.");
  const plaintext = enc.encode(JSON.stringify({ entries }));
  const content = await aesEncrypt(plaintext, key);
  plaintext.fill(0);
  return { ...envelope, content };
}

export async function resetMaster(envelope, key, nextMaster) {
  if (nextMaster.trim().length < 16)
    throw Error(
      "La nouvelle phrase maître doit contenir au moins 16 caractères.",
    );
  // La CryptoKey non exportable a un usage 'encrypt' ; on déchiffre l'ancienne enveloppe
  // sous clé dataKey, puis regénère la même clé de contenu seulement dans cette opération.
  // Pour ne PAS exposer une clé symétrique exportable, on renouvelle tout le coffre.
  const oldData = await aesDecrypt(envelope.content, key);
  const recovered = JSON.parse(dec.decode(oldData));
  oldData.fill(0);
  const newVault = await createVault(nextMaster);
  const rewritten = await encryptEntries(
    newVault.envelope,
    newVault.key,
    recovered.entries,
  );
  return { envelope: rewritten, key: newVault.key, rescue: newVault.rescue };
}

export function normalizeSite(input) {
  let value = input.trim();
  if (!value) throw Error("Indiquez l'adresse du site.");
  if (!/^https?:\/\//i.test(value)) value = "https://" + value;
  const parsed = new URL(value);
  if (
    !["https:", "http:"].includes(parsed.protocol) ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password
  ) {
    throw Error("Utilisez une adresse de site HTTP(S) sans identifiants.");
  }
  const domain = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (
    domain === "localhost" ||
    !domain.includes(".") ||
    domain.endsWith(".local")
  ) {
    throw Error("Le domaine doit correspondre à un site public.");
  }
  return { domain, url: parsed.origin };
}

export function isReused(entries, candidate, excludedId = null) {
  return entries.some((v) => v.id !== excludedId && v.password === candidate);
}
