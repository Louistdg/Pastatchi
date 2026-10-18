import test from "node:test";
import assert from "node:assert/strict";
import {
  createVault, openVault, encryptEntries, resetMaster,
  generatePassword, generatePassphrase, normalizeSite, isReused,
  estimateStrength,
} from "../src/passwordCrypto.js";

const MASTER = "Cette phrase de passe est longue et personnelle !";

test("générateur : caractères et minimum de longueur", () => {
  const p = generatePassword(24);
  assert.equal(p.length, 24);
  assert.match(p, /[A-Z]/);
  assert.match(p, /[a-z]/);
  assert.match(p, /[2-9]/);
  assert.match(p, /[!@#$%*+\-_?]/);
  assert.notEqual(generatePassword(24), generatePassword(24));
  assert.throws(() => generatePassword(8));
});

test("phrase de passe : 7 mots français aléatoires", () => {
  const words = generatePassphrase(7).split("-");
  assert.equal(words.length, 7);
  assert.notEqual(generatePassphrase(7), generatePassphrase(7));
  assert.throws(() => generatePassphrase(3));
});

test("validation URL et détection locale de réutilisation", () => {
  assert.equal(normalizeSite("https://www.example.fr/login").domain, "example.fr");
  assert.throws(() => normalizeSite("ftp://example.fr"));
  const entries = [{ id: "a", password: "AAA" }, { id: "b", password: "BBB" }];
  assert.equal(isReused(entries, "AAA"), true);
  assert.equal(isReused(entries, "AAA", "a"), false);
  assert.equal(estimateStrength("123456").label, "Faible");
});

test("coffre : création, ouverture, chiffrement des entrées, mauvaise phrase", async () => {
  const made = await createVault(MASTER);
  assert.equal(made.envelope.format, 1);
  assert.equal(made.rescue.length, 43);
  const entry = {id: "a", siteName: "Site privé", username: "alice@example.fr", password: "SECRET_NE_JAMAIS_STOCKER_EN_CLAIR"};
  const stored = await encryptEntries(made.envelope, made.key, [entry]);
  const text = JSON.stringify(stored);
  assert.ok(!text.includes(entry.password));
  assert.ok(!text.includes(entry.username));
  assert.ok(!text.includes(entry.siteName));
  const opened = await openVault(stored, MASTER);
  assert.deepEqual(opened.entries, [entry]);
  await assert.rejects(() => openVault(stored, "Phrase maître invalide"));
  const rescued = await openVault(stored, made.rescue, true);
  assert.deepEqual(rescued.entries, [entry]);
  await assert.rejects(() => openVault(stored, "clef fausse", true));
});

test("coffre : remplacement de phrase maître et nouvelle clé de secours", async () => {
  const made = await createVault(MASTER);
  const first = await encryptEntries(made.envelope, made.key, [{id:"1",password:"abc"}]);
  const updated = await resetMaster(first, made.key, "Ma nouvelle phrase longue 2026");
  assert.notEqual(updated.rescue, made.rescue);
  assert.deepEqual((await openVault(updated.envelope, "Ma nouvelle phrase longue 2026")).entries, [{id:"1",password:"abc"}]);
  await assert.rejects(() => openVault(updated.envelope, MASTER));
  await assert.rejects(() => openVault(updated.envelope, made.rescue, true));
  assert.deepEqual((await openVault(updated.envelope, updated.rescue, true)).entries, [{id:"1",password:"abc"}]);
});

test("coffre : toute altération du contenu chiffré provoque un échec", async () => {
  const made = await createVault(MASTER);
  const tampered = structuredClone(made.envelope);
  tampered.content.data = tampered.content.data.slice(0,-3) + "AAA";
  await assert.rejects(() => openVault(tampered, MASTER));
});
