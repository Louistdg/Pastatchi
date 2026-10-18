import test from "node:test";
import assert from "node:assert/strict";
import {
  createVault,
  encryptEntries,
  estimateStrength,
  generatePassphrase,
  generatePassword,
  openVault,
} from "../src/passwordCrypto.js";

const MASTER = "Phrase maîtresse de contrôle QA 2026 très longue";

test("bornes du générateur : 16 et 64 caractères avec chaque groupe requis", () => {
  for (const length of [16, 64]) {
    for (let iteration = 0; iteration < 5; iteration += 1) {
      const password = generatePassword(length);
      assert.equal(password.length, length);
      assert.match(password, /[A-Z]/);
      assert.match(password, /[a-z]/);
      assert.match(password, /[2-9]/);
      assert.match(password, /[!@#$%*+\-_?]/);
    }
  }
  for (const invalid of [0, 15, 65, -1, 16.5, NaN]) {
    assert.throws(() => generatePassword(invalid));
  }
});

test("phrase de passe : sept mots reliés par des tirets", () => {
  const result = generatePassphrase(7);
  assert.equal(result.split("-").length, 7);
  assert.ok(result.length > 20);
});

test("estimation de force : valeurs explicitement estimées, sans garantie", () => {
  assert.equal(estimateStrength("123456").label, "Faible");
  // Une chaîne longue peut rester faible si elle contient « mot de passe ».
  assert.equal(estimateStrength("MonSuperMotDePasse!2026").label, "Faible");
  const long = estimateStrength("VeR8#nuages2026_Plaine");
  assert.equal(long.label, "Fort (estimation)");
  assert.equal(long.level, 3);
  assert.match(long.advice, /Vérifiez|apparente/);
});

test("coffre : métadonnées chiffrées côté navigateur et CryptoKey non exportable", async () => {
  const created = await createVault(MASTER);
  const env = created.envelope;
  assert.deepEqual(Object.keys(env).sort(), [
    "content", "format", "kdf", "recovery_kdf", "recovery_wrapped_key", "wrapped_key",
  ]);
  assert.equal(env.kdf.algorithm, "PBKDF2-SHA256");
  assert.ok(env.kdf.iterations >= 400_000);
  for (const field of ["kdf", "recovery_kdf"]) {
    assert.ok(env[field].salt.length > 12);
  }
  for (const field of ["wrapped_key", "recovery_wrapped_key", "content"]) {
    assert.ok(env[field].iv.length > 0);
    assert.ok(env[field].data.length > 0);
  }
  assert.equal(created.key.extractable, false);
  await assert.rejects(() => crypto.subtle.exportKey("raw", created.key));
  const secret = "NE_JAMAIS_PERSISTER_CETTE_INFORMATION_EN_CLAIR";
  const updated = await encryptEntries(env, created.key, [
    { id: "entry-1", siteName: "Compte de test", password: secret },
  ]);
  assert.ok(!JSON.stringify(updated).includes(secret));
  const opened = await openVault(updated, MASTER);
  assert.equal(opened.entries[0].password, secret);
});

test("coffre : limite à 100 entrées, la 101e est rejetée sans écriture", async () => {
  const created = await createVault(MASTER);
  const entries = Array.from({ length: 100 }, (_, i) => ({
    id: String(i), password: "contenu de test " + i,
  }));
  const allowed = await encryptEntries(created.envelope, created.key, entries);
  assert.equal((await openVault(allowed, MASTER)).entries.length, 100);
  await assert.rejects(
    () => encryptEntries(created.envelope, created.key, [
      ...entries, { id: "101", password: "ne pas écrire" },
    ]),
  );
});
