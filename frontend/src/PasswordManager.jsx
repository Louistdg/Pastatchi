import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  WandSparkles,
  X,
} from "lucide-react";
import {
  VAULT_IDLE_MS,
  generatePassword,
  generatePassphrase,
  estimateStrength,
  createVault,
  openVault,
  encryptEntries,
  resetMaster,
  normalizeSite,
  isReused,
} from "./passwordCrypto.js";

let clipboardClearHandle = null;

function ClipboardCountdown({ remaining }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  return (
    <aside className="clipboard-countdown" role="status" aria-live="off">
      <svg
        className="clipboard-timer-ring"
        width="76"
        height="76"
        viewBox="0 0 76 76"
        role="progressbar"
        aria-label="Temps avant la tentative d'effacement du presse-papiers"
        aria-valuemin={0}
        aria-valuemax={60}
        aria-valuenow={remaining}
      >
        <circle cx="38" cy="38" r={radius} className="clipboard-timer-track" />
        <circle
          cx="38"
          cy="38"
          r={radius}
          className="clipboard-timer-progress"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - remaining / 60)}
        />
        <text
          x="38"
          y="44"
          textAnchor="middle"
          className="clipboard-timer-number"
        >
          {remaining}s
        </text>
      </svg>
      <div>
        <strong>Mot de passe copié</strong>
        <p>
          Tentative d'effacement du presse-papiers dans {remaining} seconde
          {remaining > 1 ? "s" : ""}.
        </p>
        <small>
          Le navigateur et l'historique du système peuvent empêcher son
          effacement.
        </small>
      </div>
    </aside>
  );
}

const MASTER_NOTICE =
  "La phrase maître n'est jamais envoyée au serveur. Sans phrase maître ni clé de secours, le coffre ne pourra pas être récupéré.";

function FaviconFallback({ name }) {
  return (
    <span className="vault-site-icon" aria-hidden="true">
      {(name || "?").trim()[0]?.toUpperCase() || "?"}
    </span>
  );
}
function Strength({ value }) {
  const s = estimateStrength(value);
  return (
    <div className="strength-meter">
      <div className="strength-head">
        <span>Robustesse estimée</span>
        <strong className={"strength-" + s.level}>{s.label}</strong>
      </div>
      <div className="strength-bars" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <i className={s.level >= n ? "on level-" + s.level : ""} key={n} />
        ))}
      </div>
      <small>{s.advice}</small>
    </div>
  );
}
function PasswordGenerator({ onUse, onCopy }) {
  const [kind, setKind] = useState("automatic");
  const [length, setLength] = useState(20);
  const [secret, setSecret] = useState(() => generatePassword(20));
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState("");

  const regenerate = (nextKind = kind, nextLength = length) => {
    const result =
      nextKind === "phrase"
        ? generatePassphrase(7)
        : generatePassword(nextLength);
    setSecret(result);
    setMessage("");
    setVisible(false);
  };
  const chosen = kind === "manual" ? manual : secret;
  const apply = () => {
    if (!chosen) {
      setMessage("Saisissez ou générez un mot de passe.");
      return;
    }
    onUse?.(chosen);
    setMessage("Mot de passe placé dans le formulaire d'enregistrement.");
  };
  const copied = async () => {
    if (!chosen) return;
    try {
      await onCopy(chosen);
      setMessage(
        "Copié. Effacement du presse-papiers tenté après 60 secondes, si le navigateur l'autorise.",
      );
    } catch {
      setMessage("Copie refusée par le navigateur.");
    }
  };
  return (
    <div className="vault-generator">
      <div className="vault-card-title">
        <WandSparkles size={22} />
        <div>
          <h3>Générateur de mots de passe</h3>
          <p>Tout est créé sur cet appareil, sans appel externe.</p>
        </div>
      </div>
      <div className="vault-tabs" role="group" aria-label="Type de création">
        <button
          className={kind === "automatic" ? "current" : ""}
          onClick={() => {
            setKind("automatic");
            regenerate("automatic");
          }}
          type="button"
        >
          Mot de passe
        </button>
        <button
          className={kind === "phrase" ? "current" : ""}
          onClick={() => {
            setKind("phrase");
            regenerate("phrase");
          }}
          type="button"
        >
          Phrase aléatoire
        </button>
        <button
          className={kind === "manual" ? "current" : ""}
          onClick={() => {
            setKind("manual");
            setMessage("");
          }}
          type="button"
        >
          Saisir le mien
        </button>
      </div>
      {kind === "automatic" && (
        <label className="vault-label vault-length">
          Longueur : <strong>{length} caractères</strong>
          <input
            type="range"
            min="16"
            max="40"
            step="1"
            value={length}
            onChange={(e) => {
              const n = Number(e.target.value);
              setLength(n);
              regenerate("automatic", n);
            }}
          />
        </label>
      )}
      {kind === "phrase" && (
        <p className="vault-hint">
          7 mots choisis au hasard parmi 2 048 mots français — soit environ 77
          bits d'entropie théorique. Plus sûr qu'une phrase inventée.
        </p>
      )}
      {kind === "manual" ? (
        <div className="vault-secret-row">
          <input
            aria-label="Mot de passe personnel"
            value={manual}
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            onChange={(e) => setManual(e.target.value)}
            placeholder="Tapez votre mot de passe"
            maxLength={512}
          />
          <button
            className="vault-icon-btn"
            type="button"
            aria-label={visible ? "Masquer" : "Afficher"}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      ) : (
        <div className="vault-secret-row">
          <input
            aria-label="Mot de passe généré"
            type={visible ? "text" : "password"}
            readOnly
            value={secret}
          />
          <button
            className="vault-icon-btn"
            type="button"
            aria-label={visible ? "Masquer" : "Afficher"}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button
            className="vault-icon-btn"
            type="button"
            aria-label="Regénérer"
            onClick={() => regenerate()}
          >
            <RefreshCw size={19} />
          </button>
        </div>
      )}
      {kind === "manual" && <Strength value={manual} />}
      <div className="vault-actions">
        <button
          type="button"
          className="primary-action"
          onClick={copied}
          disabled={!chosen}
        >
          <Copy size={17} /> Copier
        </button>
        {onUse && (
          <button
            type="button"
            className="outline-action"
            onClick={apply}
            disabled={!chosen}
          >
            <Plus size={17} /> Utiliser dans le coffre
          </button>
        )}
      </div>
      {message && (
        <p className="vault-inline-status" role="status">
          {message}
        </p>
      )}
      <p className="vault-hint">
        Le presse-papiers peut conserver une copie dans l'historique du système.
        Son effacement automatique n'est pas garanti.
      </p>
    </div>
  );
}

export default function PasswordManager({ api }) {
  const [phase, setPhase] = useState("loading");
  const [envelope, setEnvelope] = useState(null),
    [revision, setRevision] = useState(null);
  const [key, setKey] = useState(null),
    [entries, setEntries] = useState([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [master, setMaster] = useState(""),
    [confirmMaster, setConfirmMaster] = useState("");
  const [unlockSecret, setUnlockSecret] = useState(""),
    [recoveryMode, setRecoveryMode] = useState(false);
  const [pending, setPending] = useState(null),
    [backupConfirmed, setBackupConfirmed] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [changingMaster, setChangingMaster] = useState(false);
  const [clipboardExpiresAt, setClipboardExpiresAt] = useState(0);
  const [clipboardRemaining, setClipboardRemaining] = useState(0);
  const [siteName, setSiteName] = useState(""),
    [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState(""),
    [entrySecret, setEntrySecret] = useState("");
  const [method, setMethod] = useState("new"),
    [reuseId, setReuseId] = useState("");
  const [search, setSearch] = useState(""),
    [revealed, setRevealed] = useState(null);
  const lastAction = useRef(Date.now());
  const lockRef = useRef(null);

  const clearFields = () => {
    setEntrySecret("");
    setReuseId("");
    setUsername("");
    setSiteName("");
    setSiteUrl("");
  };
  const lock = () => {
    setKey(null);
    setEntries([]);
    setRevealed(null);
    setEntrySecret("");
    setUnlockSecret("");
    setRecovered(false);
    setChangingMaster(false);
    setMaster("");
    setConfirmMaster("");
    setPhase("locked");
    setNotice("Coffre verrouillé.");
  };
  lockRef.current = lock;
  useEffect(() => {
    let active = true;
    api("/api/v1/vault")
      .then((res) => {
        if (!active) return;
        setEnvelope(res.envelope);
        setRevision(res.revision);
        setPhase(res.exists ? "locked" : "empty");
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setPhase("error");
        }
      });
    return () => {
      active = false;
    };
  }, [api]);
  useEffect(() => {
    if (phase !== "open" && phase !== "backup") return undefined;
    lastAction.current = Date.now();
    const touch = () => {
      lastAction.current = Date.now();
    };
    const guard = () => {
      if (Date.now() - lastAction.current < VAULT_IDLE_MS) return;
      if (phase === "backup") {
        setPending(null);
        setBackupConfirmed(false);
        if (envelope) lockRef.current?.();
        else {
          setPhase("empty");
          setNotice(
            "La création a expiré. Recommencez et notez la nouvelle clé de secours.",
          );
        }
      } else lockRef.current?.();
    };
    ["pointerdown", "keydown", "touchstart"].forEach((type) =>
      document.addEventListener(type, touch),
    );
    const timer = setInterval(guard, 15000);
    document.addEventListener("visibilitychange", guard);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", guard);
      ["pointerdown", "keydown", "touchstart"].forEach((type) =>
        document.removeEventListener(type, touch),
      );
    };
  }, [phase, envelope]);
  useEffect(() => {
    if (!revealed) return undefined;
    const timer = setTimeout(() => setRevealed(null), 20000);
    return () => clearTimeout(timer);
  }, [revealed]);

  useEffect(() => {
    if (!clipboardExpiresAt) return undefined;
    const tick = () =>
      setClipboardRemaining(
        Math.max(0, Math.ceil((clipboardExpiresAt - Date.now()) / 1000)),
      );
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [clipboardExpiresAt]);

  const copySecret = async (text) => {
    await navigator.clipboard.writeText(text);
    if (clipboardClearHandle !== null) clearTimeout(clipboardClearHandle);
    const expiry = Date.now() + 60000;
    setClipboardExpiresAt(expiry);
    setClipboardRemaining(60);
    // Best effort : uniquement si le contenu actuel est exactement celui copié,
    // et si le navigateur autorise la lecture du presse-papiers.
    // Timer module-scope : il continue même si la page « Mots de passe » est quittée.
    clipboardClearHandle = setTimeout(async () => {
      try {
        if ((await navigator.clipboard.readText()) === text) {
          await navigator.clipboard.writeText("");
        }
      } catch {
        /* permission refusée ou onglet fermé : effacement non garanti */
      } finally {
        clipboardClearHandle = null;
      }
    }, 60000);
  };

  async function beginCreate(event) {
    event.preventDefault();
    setError("");
    if (master.trim().length < 16) {
      setError("La phrase maître doit contenir au moins 16 caractères.");
      return;
    }
    if (master !== confirmMaster) {
      setError("Les deux phrases ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      const result = await createVault(master);
      setPending({ ...result, kind: "create" });
      setPhase("backup");
      setBackupConfirmed(false);
      setMaster("");
      setConfirmMaster("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function prepareReset(event) {
    event.preventDefault();
    setError("");
    if (master !== confirmMaster) {
      setError("Les deux phrases ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      const result = await resetMaster(envelope, key, master);
      setPending({ ...result, kind: "reset" });
      setPhase("backup");
      setBackupConfirmed(false);
      setMaster("");
      setConfirmMaster("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function activateBackup() {
    if (!pending || !backupConfirmed) return;
    setBusy(true);
    setError("");
    try {
      const res = await api("/api/v1/vault", {
        method: "PUT",
        body: JSON.stringify({ revision, envelope: pending.envelope }),
      });
      setRevision(res.revision);
      setEnvelope(pending.envelope);
      setKey(pending.key);
      setEntries(pending.kind === "create" ? [] : entries);
      setPending(null);
      setBackupConfirmed(false);
      setRecovered(false);
      setChangingMaster(false);
      setPhase("open");
      setNotice(
        "Coffre chiffré enregistré localement. Conservez votre clé de secours hors de l'appareil.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function unlock(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await openVault(envelope, unlockSecret, recoveryMode);
      setKey(result.key);
      setEntries(result.entries);
      setRecovered(recoveryMode);
      setPhase("open");
      setUnlockSecret("");
      setNotice(
        recoveryMode
          ? "Clé de secours acceptée. Définissez une nouvelle phrase maître."
          : "Coffre déverrouillé.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function persist(items) {
    const updated = await encryptEntries(envelope, key, items);
    const response = await api("/api/v1/vault", {
      method: "PUT",
      body: JSON.stringify({ revision, envelope: updated }),
    });
    setEnvelope(updated);
    setRevision(response.revision);
    setEntries(items);
  }

  async function saveEntry(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (phase !== "open" || !key) {
      setError("Déverrouillez le coffre.");
      return;
    }
    let selectedPassword = entrySecret;
    if (method === "reuse") {
      const source = entries.find((v) => v.id === reuseId);
      if (!source) {
        setError("Sélectionnez un compte existant.");
        return;
      }
      selectedPassword = source.password;
    }
    if (!selectedPassword) {
      setError("Choisissez un mot de passe.");
      return;
    }
    let site;
    try {
      site = normalizeSite(siteUrl);
    } catch (e) {
      setError(e.message);
      return;
    }
    const name = siteName.trim() || site.domain;
    if (
      method === "reuse" &&
      entries.find((v) => v.id === reuseId)?.domain !== site.domain
    ) {
      if (
        !window.confirm(
          "ATTENTION : réutiliser le même mot de passe sur plusieurs sites est risqué. Continuer malgré ce risque ?",
        )
      )
        return;
    } else if (isReused(entries, selectedPassword)) {
      if (
        !window.confirm(
          "Ce mot de passe existe déjà dans le coffre. Pour mieux protéger vos comptes, utilisez-en un différent. Continuer ?",
        )
      )
        return;
    }
    const record = {
      id: crypto.randomUUID(),
      siteName: name.slice(0, 100),
      siteUrl: site.url,
      domain: site.domain,
      username: username.trim().slice(0, 200),
      password: selectedPassword,
      createdAt: new Date().toISOString(),
    };
    setBusy(true);
    try {
      await persist([...entries, record]);
      clearFields();
      setMethod("new");
      setNotice("Compte enregistré dans le coffre chiffré.");
    } catch (e) {
      setError("Sauvegarde impossible : " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(id) {
    if (!window.confirm("Supprimer définitivement cet identifiant du coffre ?"))
      return;
    setBusy(true);
    setError("");
    try {
      await persist(entries.filter((e) => e.id !== id));
      setRevealed(null);
      setNotice("Entrée supprimée du coffre.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteVault() {
    if (
      !window.confirm(
        "Supprimer tout le coffre et TOUS ses mots de passe enregistrés ? Cette action est irréversible.",
      )
    )
      return;
    if (
      !window.confirm(
        "Dernière confirmation : avez-vous sauvegardé vos mots de passe ailleurs ?",
      )
    )
      return;
    setBusy(true);
    try {
      await api("/api/v1/vault", { method: "DELETE" });
      setEnvelope(null);
      setRevision(null);
      setKey(null);
      setEntries([]);
      clearFields();
      setPhase("empty");
      setNotice("Coffre supprimé.");
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = entries.filter((e) =>
    (e.siteName + " " + e.domain + " " + e.username)
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );

  return (
    <div className="page-body password-page">
      <div className="page-heading">
        <div className="eyebrow">MOTS DE PASSE · SUR CET APPAREIL</div>
        <h1>
          Le bon mot de passe, <span>au bon endroit.</span>
        </h1>
        <p>
          Créez des mots de passe uniques et conservez-les dans un coffre
          chiffré, à la demande. Aucune synchronisation cloud.
        </p>
      </div>
      {clipboardRemaining > 0 && (
        <ClipboardCountdown remaining={clipboardRemaining} />
      )}
      <div className="password-layout">
        <section className="glass password-workspace">
          <PasswordGenerator
            onCopy={copySecret}
            onUse={
              phase === "open"
                ? (secret) => {
                    setEntrySecret(secret);
                    setMethod("new");
                    setNotice(
                      "Mot de passe transféré dans le formulaire ci-dessous.",
                    );
                  }
                : undefined
            }
          />
          {phase === "open" && (
            <div className="vault-add-section">
              <div className="vault-card-title">
                <Plus size={21} />
                <div>
                  <h3>Enregistrer un accès</h3>
                  <p>
                    Le site, l'identifiant et le mot de passe seront tous
                    chiffrés.
                  </p>
                </div>
              </div>
              <form onSubmit={saveEntry} autoComplete="off">
                <div className="vault-two">
                  <label className="vault-label">
                    Nom du site
                    <input
                      autoComplete="off"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      placeholder="Ex. : Ma banque"
                      maxLength="100"
                    />
                  </label>
                  <label className="vault-label">
                    Adresse du site
                    <input
                      autoComplete="off"
                      value={siteUrl}
                      onChange={(e) => setSiteUrl(e.target.value)}
                      placeholder="https://exemple.fr"
                      required
                      maxLength="500"
                    />
                  </label>
                </div>
                <label className="vault-label">
                  Identifiant ou e-mail (facultatif)
                  <input
                    autoComplete="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="mon.nom@exemple.fr"
                    maxLength="200"
                  />
                </label>
                <div className="vault-tabs">
                  <button
                    type="button"
                    className={method === "new" ? "current" : ""}
                    onClick={() => setMethod("new")}
                  >
                    Nouveau mot de passe
                  </button>
                  <button
                    type="button"
                    className={method === "reuse" ? "current" : ""}
                    disabled={!entries.length}
                    onClick={() => setMethod("reuse")}
                  >
                    Utiliser un existant
                  </button>
                </div>
                {method === "new" ? (
                  <>
                    <label className="vault-label">
                      Mot de passe
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={entrySecret}
                        maxLength="512"
                        onChange={(e) => setEntrySecret(e.target.value)}
                        required
                        placeholder="Générez ci-dessus ou saisissez ici"
                      />
                    </label>
                    <Strength value={entrySecret} />
                  </>
                ) : (
                  <>
                    <label className="vault-label">
                      Compte déjà enregistré
                      <select
                        value={reuseId}
                        onChange={(e) => setReuseId(e.target.value)}
                        required
                      >
                        <option value="">Sélectionnez un compte</option>
                        {entries.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.siteName} — {item.username || item.domain}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="vault-warning">
                      <AlertTriangle size={17} /> Réutiliser le même mot de
                      passe sur différents sites est risqué. Nous recommandons
                      un mot de passe unique.
                    </p>
                  </>
                )}
                <button
                  className="primary-action"
                  type="submit"
                  disabled={busy}
                >
                  <LockKeyhole size={17} /> Enregistrer dans le coffre
                </button>
              </form>
            </div>
          )}
        </section>
        <section className="glass password-vault">
          <div className="vault-card-title">
            <LockKeyhole size={22} />
            <div>
              <h3>Coffre-fort local</h3>
              <p>
                {phase === "open"
                  ? "Déverrouillé — verrouillage automatique après 5 minutes d’inactivité"
                  : phase === "loading"
                    ? "Chargement…"
                    : "Chiffré et protégé par votre phrase maître"}
              </p>
            </div>
          </div>
          {phase === "loading" && (
            <p className="vault-hint">Lecture de la base locale…</p>
          )}
          {phase === "error" && (
            <button
              type="button"
              className="outline-action"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </button>
          )}
          {phase === "empty" && (
            <form className="vault-auth-form" onSubmit={beginCreate}>
              <p className="vault-hint">
                Aucun coffre sur cet ordinateur. Créez une phrase maître longue
                et mémorable. Une clé de secours vous sera remise.
              </p>
              <label className="vault-label">
                Phrase maître
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength="16"
                  value={master}
                  onChange={(e) => setMaster(e.target.value)}
                  required
                  placeholder="Une longue phrase que vous seul connaissez"
                />
              </label>
              <label className="vault-label">
                Répétez la phrase maître
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmMaster}
                  onChange={(e) => setConfirmMaster(e.target.value)}
                  required
                />
              </label>
              <Strength value={master} />
              <p className="vault-hint">{MASTER_NOTICE}</p>
              <button className="primary-action" type="submit" disabled={busy}>
                <ShieldCheck size={17} />{" "}
                {busy ? "Chiffrement en cours…" : "Créer mon coffre"}
              </button>
            </form>
          )}
          {phase === "locked" && (
            <form className="vault-auth-form" onSubmit={unlock}>
              <label className="vault-label">
                {recoveryMode ? "Clé de secours" : "Phrase maître"}
                <input
                  type="password"
                  autoComplete="off"
                  value={unlockSecret}
                  onChange={(e) => setUnlockSecret(e.target.value)}
                  placeholder={
                    recoveryMode
                      ? "Collez votre clé de secours"
                      : "Votre phrase maître"
                  }
                  required
                />
              </label>
              <button className="primary-action" disabled={busy} type="submit">
                <Unlock size={17} />
                {busy ? "Déchiffrement…" : "Déverrouiller"}
              </button>
              <button
                className="vault-link"
                type="button"
                onClick={() => {
                  setRecoveryMode(!recoveryMode);
                  setUnlockSecret("");
                  setError("");
                }}
              >
                {recoveryMode
                  ? "Utiliser ma phrase maître"
                  : "J’ai oublié ma phrase maître"}
              </button>
            </form>
          )}
          {phase === "backup" && pending && (
            <div
              className="vault-backup"
              role="group"
              aria-label="Clé de secours"
            >
              <div className="vault-warning">
                <AlertTriangle size={19} />
                <strong>
                  Étape indispensable : notez votre nouvelle clé de secours.
                </strong>
              </div>
              <p>
                Gardez-la sur papier ou dans un endroit sûr, séparé de cet
                appareil. Elle ne sera plus affichée après activation. La clé de
                secours ne remplace pas une sauvegarde du coffre chiffré en cas
                de panne de l'ordinateur.
              </p>
              <div className="recovery-display">{pending.rescue}</div>
              <button
                className="outline-action"
                type="button"
                onClick={() =>
                  copySecret(pending.rescue).then(() =>
                    setNotice("Clé copiée : gardez-la dans un endroit sûr."),
                  )
                }
              >
                <Copy size={16} /> Copier la clé
              </button>
              <label className="check-label vault-backup-check">
                <input
                  type="checkbox"
                  checked={backupConfirmed}
                  onChange={(e) => setBackupConfirmed(e.target.checked)}
                />
                J’ai noté la clé de secours et je comprends que sa perte peut
                rendre le coffre inaccessible.
              </label>
              <button
                type="button"
                className="primary-action"
                disabled={!backupConfirmed || busy}
                onClick={activateBackup}
              >
                {busy ? "Enregistrement…" : "Activer le coffre chiffré"}
              </button>
              <button
                className="vault-link"
                type="button"
                onClick={() => {
                  setPending(null);
                  setPhase(envelope ? "open" : "empty");
                }}
              >
                Annuler cette opération
              </button>
            </div>
          )}
          {phase === "open" && (
            <>
              <div className="vault-summary">
                <span className="vault-unlocked">
                  <CheckCircle2 size={16} /> Déverrouillé
                </span>
                <button className="outline-action" type="button" onClick={lock}>
                  <Lock size={17} /> Verrouiller
                </button>
              </div>
              <button
                className="vault-link"
                type="button"
                onClick={() => setChangingMaster(!changingMaster)}
              >
                {changingMaster
                  ? "Annuler le changement"
                  : "Changer ma phrase maître"}
              </button>
              {(recovered || changingMaster) && (
                <form className="vault-recover-form" onSubmit={prepareReset}>
                  <p className="vault-warning">
                    <AlertTriangle size={18} /> Récupération réussie. Remplacez
                    maintenant la phrase maître oubliée ; une nouvelle clé de
                    secours sera créée.
                  </p>
                  <label className="vault-label">
                    Nouvelle phrase maître
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength="16"
                      value={master}
                      onChange={(e) => setMaster(e.target.value)}
                      required
                    />
                  </label>
                  <label className="vault-label">
                    Confirmer
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmMaster}
                      onChange={(e) => setConfirmMaster(e.target.value)}
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="primary-action"
                  >
                    Renouveler la phrase maître
                  </button>
                </form>
              )}
              <label className="vault-search" aria-label="Rechercher un site">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un site ou un identifiant"
                />
              </label>
              <div className="vault-entries">
                {filtered.length ? (
                  filtered.map((v) => {
                    const duplicate = isReused(entries, v.password, v.id);
                    return (
                      <article className="vault-entry" key={v.id}>
                        <FaviconFallback name={v.siteName} />
                        <div className="vault-entry-main">
                          <strong>{v.siteName}</strong>
                          <span>{v.domain}</span>
                          <small>{v.username || "Aucun identifiant"}</small>
                          {duplicate && (
                            <span className="vault-reuse-badge">
                              <AlertTriangle size={13} /> Mot de passe réutilisé
                            </span>
                          )}
                          {revealed === v.id && (
                            <code className="vault-revealed">{v.password}</code>
                          )}
                        </div>
                        <div className="vault-entry-actions">
                          <button
                            title="Copier le mot de passe"
                            aria-label={"Copier " + v.siteName}
                            className="vault-icon-btn"
                            type="button"
                            onClick={() =>
                              copySecret(v.password).then(
                                () =>
                                  setNotice(
                                    "Mot de passe copié : tentative d’effacement après 60 secondes.",
                                  ),
                                () => setError("Copie impossible."),
                              )
                            }
                          >
                            <Copy size={17} />
                          </button>
                          <button
                            className="vault-icon-btn"
                            title="Afficher temporairement"
                            aria-label={"Afficher " + v.siteName}
                            type="button"
                            onClick={() =>
                              setRevealed(revealed === v.id ? null : v.id)
                            }
                          >
                            {revealed === v.id ? (
                              <EyeOff size={17} />
                            ) : (
                              <Eye size={17} />
                            )}
                          </button>
                          <button
                            className="vault-icon-btn danger"
                            title="Supprimer cette entrée"
                            aria-label={"Supprimer " + v.siteName}
                            onClick={() => removeEntry(v.id)}
                            type="button"
                            disabled={busy}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="vault-empty">
                    <KeyRound size={27} />
                    <p>
                      {entries.length
                        ? "Aucun résultat pour cette recherche."
                        : "Votre coffre est vide. Enregistrez votre premier compte."}
                    </p>
                  </div>
                )}
              </div>
              <button
                className="vault-delete-link"
                onClick={deleteVault}
                disabled={busy}
                type="button"
              >
                <Trash2 size={14} /> Supprimer entièrement le coffre
              </button>
            </>
          )}
          {error && (
            <p className="vault-error" role="alert">
              <AlertTriangle size={16} />
              {error}
            </p>
          )}
          {notice && (
            <p className="vault-inline-status" role="status">
              <Check size={17} />
              {notice}
            </p>
          )}
        </section>
      </div>
      <div className="vault-privacy-notice">
        <Fingerprint size={19} />
        <span>
          <strong>Coffre alpha local :</strong> les noms des sites, identifiants
          et mots de passe sont chiffrés dans le navigateur avant leur stockage.
          Aucun remplissage automatique ni synchronisation cloud. Cette version
          n’a pas encore subi d’audit cryptographique indépendant.
        </span>
      </div>
    </div>
  );
}
