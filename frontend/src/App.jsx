import React, { useEffect, useState } from "react";
import PRODUCT from "../../version.json";
const VERSION = PRODUCT.version;
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Eye,
  FileText,
  Globe2,
  HeartHandshake,
  Home,
  Info,
  Link2,
  LockKeyhole,
  Mail,
  Menu,
  MessageCircle,
  PhoneCall,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  ExternalLink,
  ListChecks,
} from "lucide-react";

const MENU = [
  { key: "home", label: "Accueil", icon: Home },
  { key: "analyze", label: "Analyser", icon: Search },
  { key: "history", label: "Historique", icon: Clock3 },
  { key: "protection", label: "Protection", icon: ShieldCheck },
  { key: "advice", label: "Conseils", icon: BookOpen },
  { key: "settings", label: "Paramètres", icon: Settings },
];
const MODULES = [
  {
    label: "E-mail",
    detail: "Examiner un message reçu",
    icon: Mail,
    type: "text",
    accent: "purple",
    active: true,
  },
  {
    label: "SMS",
    detail: "Déceler une tentative de fraude",
    icon: MessageCircle,
    type: "text",
    accent: "blue",
    active: true,
  },
  {
    label: "Lien",
    detail: "Vérifier une URL suspecte",
    icon: Link2,
    type: "url",
    accent: "violet",
    active: true,
  },
  {
    label: "Site web",
    detail: "Contrôler une page publique",
    icon: Globe2,
    type: "url",
    accent: "cyan",
    active: true,
  },
  {
    label: "Fichier",
    detail: "Analyse prévue en V2",
    icon: FileText,
    accent: "teal",
    active: false,
  },
  {
    label: "Capture",
    detail: "Import prévu en V2",
    icon: Eye,
    accent: "blue",
    active: false,
  },
  {
    label: "Appel",
    detail: "Vérification prévue en V2",
    icon: PhoneCall,
    accent: "purple",
    active: false,
  },
];
const RISK_LABELS = {
  Faible: "Risque faible",
  Modéré: "Risque modéré",
  Élevé: "Risque élevé",
  Critique: "Risque critique",
  Indéterminé: "Indéterminé",
};
const riskClass = {
  Faible: "low",
  Modéré: "medium",
  Élevé: "high",
  Critique: "critical",
  Indéterminé: "unknown",
};
const dateLabel = (s) =>
  new Date(s).toLocaleString("fr-BE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
const api = async (path, opts = {}) => {
  const result = await fetch(path, {
    ...opts,
    headers: {
      "X-PastaTshield-Token": window.__PASTATSHIELD_TOKEN__ || "",
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  let data;
  try {
    data = await result.json();
  } catch {
    throw Error("Réponse du service illisible.");
  }
  if (!result.ok) {
    const explanation = Array.isArray(data.detail)
      ? data.detail[0]?.msg
      : typeof data.detail === "string"
        ? data.detail
        : null;
    throw Error(explanation || "Erreur du service local.");
  }
  return data;
};
function Logo() {
  return (
    <div className="logo">
      <div className="logo-mark">P</div>
      <div>
        <div className="logo-name">
          PastaT<span>shield</span>
        </div>
        <div className="logo-caption">CYBERSECURITY • FR / BE</div>
      </div>
    </div>
  );
}
function Planet() {
  return (
    <div className="planet-zone" aria-hidden="true">
      <div className="planet-halo" />
      <div className="planet" />
      <div className="orbit orbit-a" />
      <div className="orbit orbit-b" />
    </div>
  );
}
function RiskChip({ risk }) {
  return (
    <span className={"risk-pill " + (riskClass[risk] || "unknown")}>
      <span className="risk-dot" />
      {RISK_LABELS[risk] || risk}
    </span>
  );
}
function Report({ report, record, onBack }) {
  const [detail, setDetail] = useState(false);
  if (!report) return null;
  const copy = () =>
    navigator.clipboard
      ?.writeText(
        [
          "PastaTshield — Rapport d’analyse",
          RISK_LABELS[report.risk],
          report.summary,
          "\nIndicateurs:",
          ...report.findings.map((f) => "- " + f.title + " : " + f.reason),
          "\nContrôles:",
          ...report.checks.map(
            (c) => "- " + c.name + " : " + c.status + " — " + c.detail,
          ),
          "\nSources:",
          ...report.sources.map((s) => "- " + s.name + " : " + s.status),
          "\nLimites:",
          ...report.limitations,
          "\nAbsence de détection ≠ sécurité garantie.",
        ].join("\n"),
      )
      .catch(() => {});
  return (
    <section className="report-panel glass" aria-live="polite">
      <div className="panel-heading">
        <div className="heading-icon">
          <Activity size={18} />
        </div>
        <div>
          <span className="overline">RÉSULTAT DE L'ANALYSE</span>
          <h2>Votre diagnostic</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Retour à l'analyse"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </button>
      </div>
      <div className={"risk-overview " + (riskClass[report.risk] || "unknown")}>
        <div className="risk-emblem">
          <ShieldAlert size={31} />
        </div>
        <div>
          <RiskChip risk={report.risk} />
          <h3>{report.summary}</h3>
          <p>Sur la base des vérifications réellement effectuées.</p>
        </div>
      </div>
      <div className="report-grid">
        <div className="report-section">
          <h3>
            <AlertTriangle size={17} /> Indicateurs détectés (
            {report.findings.length})
          </h3>
          {report.findings.length ? (
            report.findings.map((f, i) => (
              <div className="finding" key={i}>
                <span className={"finding-severity " + riskClass[f.severity]}>
                  {f.severity}
                </span>
                <strong>{f.title}</strong>
                <p>{f.reason}</p>
                {f.evidence && <small>Indice : {f.evidence}</small>}
              </div>
            ))
          ) : (
            <div className="soft-note">
              Aucun indicateur déclenché par les règles locales. Cela ne prouve
              pas l'absence de danger.
            </div>
          )}
        </div>
        <div className="report-section">
          <h3>
            <ListChecks size={17} /> Actions recommandées
          </h3>
          {(report.recommendations || []).map((r, i) => (
            <div className="action-row" key={i}>
              <span className="step">{i + 1}</span>
              <span>{r}</span>
            </div>
          ))}
          <div className="report-action-bar">
            <button className="secondary-btn" onClick={copy}>
              <Copy size={15} /> Copier le rapport
            </button>
            <button
              className="secondary-btn"
              onClick={() => setDetail(!detail)}
            >
              <Eye size={15} /> {detail ? "Masquer" : "Voir"} les preuves
            </button>
          </div>
        </div>
      </div>
      {report.collection && (
        <div className="collection-card">
          <h3>
            <Eye size={18} /> Que peut collecter ce site ?
          </h3>
          <p>
            Indications extraites du HTML visible, sans exécuter les scripts.
            Une capacité de collecte n'est pas une transmission observée.
          </p>
          <div className="collection-grid">
            <span>Champs repérés</span>
            <strong>
              {report.collection.data_requested?.join(", ") ||
                "Aucun champ sensible identifié"}
            </strong>
            <span>Formulaires</span>
            <strong>{report.collection.form_count}</strong>
            <span>Domaines tiers référencés</span>
            <strong>
              {report.collection.third_party_domains?.join(", ") ||
                "Aucun repéré"}
            </strong>
            <span>Traceurs connus référencés</span>
            <strong>
              {report.collection.known_trackers?.join(", ") || "Aucun repéré"}
            </strong>
            <span>Cookies dans la réponse</span>
            <strong>{report.collection.observed_cookies || 0}</strong>
            <span>Échanges observés</span>
            <strong>Aucun trafic de sous-ressource exécuté</strong>
          </div>
          <p className="caution-small">
            Non vérifié : {report.collection.not_observed}
          </p>
        </div>
      )}
      {detail && (
        <div className="evidence">
          <div className="report-section">
            <h3>
              <CheckCircle2 size={17} /> Ce qui a été vérifié
            </h3>
            {report.checks.map((c, i) => (
              <div key={i} className="evidence-line">
                <span
                  className={c.status === "effectué" ? "state-yes" : "state-no"}
                >
                  {c.status}
                </span>
                <strong>{c.name}</strong>
                <p>{c.detail}</p>
              </div>
            ))}
          </div>
          <div className="report-section">
            <h3>
              <Globe2 size={17} /> Sources
            </h3>
            {report.sources.map((s, i) => (
              <div className="evidence-line" key={i}>
                <span
                  className={s.status === "effectué" ? "state-yes" : "state-no"}
                >
                  {s.status}
                </span>
                <strong>{s.name}</strong>
                <p>{s.detail}</p>
              </div>
            ))}
          </div>
          <div className="report-section">
            <h3>
              <Info size={17} /> Limites et éléments non vérifiés
            </h3>
            <ul>
              {report.limitations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="report-footnote">
        <LockKeyhole size={15} /> Analyse à la demande. Ne fournit aucune
        garantie absolue de sécurité.{" "}
        {record?.created_at &&
          "Enregistrée le " + dateLabel(record.created_at) + "."}
      </div>
    </section>
  );
}
function Recover({ close }) {
  const [s, setS] = useState("code");
  const steps = {
    code: [
      "N'utilisez plus les codes reçus pour cet échange.",
      "Ouvrez vous-même l'application officielle du service.",
      "Changez vos mots de passe depuis un appareil sûr et contactez le service concerné.",
    ],
    payment: [
      "Contactez sans attendre votre banque au numéro figurant dans votre application ou sur votre carte.",
      "Demandez les possibilités de blocage ou de contestation du paiement.",
      "Conservez les justificatifs et signalez les faits à l'organisme compétent.",
    ],
    password: [
      "Changez immédiatement ce mot de passe sur le site officiel.",
      "Changez-le aussi partout où il était réutilisé.",
      "Activez la double authentification et vérifiez les connexions récentes.",
    ],
    download: [
      "N'ouvrez pas de nouveau le fichier suspect.",
      "Déconnectez l'appareil du réseau si une infection est plausible.",
      "Utilisez les outils de sécurité de confiance et demandez une assistance qualifiée.",
    ],
  };
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="dialog glass"
        role="dialog"
        aria-modal="true"
        aria-label="J'ai déjà répondu"
      >
        <div className="dialog-header">
          <h2>
            <HeartHandshake /> J'ai déjà répondu
          </h2>
          <button className="icon-button" onClick={close} aria-label="Fermer">
            <X />
          </button>
        </div>
        <p>
          Choisissez ce qui s'est passé. Ces conseils généraux ne remplacent pas
          une assistance spécialisée.
        </p>
        <div className="incident-grid">
          {[
            ["code", "J’ai donné un code"],
            ["payment", "J’ai payé"],
            ["password", "J’ai donné un mot de passe"],
            ["download", "J’ai ouvert un fichier"],
          ].map(([key, val]) => (
            <button
              key={key}
              className={s === key ? "active" : ""}
              onClick={() => setS(key)}
            >
              {val}
            </button>
          ))}
        </div>
        <ol className="recovery-steps">
          {steps[s].map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
        <p className="muted small">
          France : Cybermalveillance.gouv.fr • Belgique : Safeonweb.be. Pour une
          fraude bancaire, contactez directement votre banque.
        </p>
      </section>
    </div>
  );
}
function App() {
  const [page, setPage] = useState("home"),
    [mode, setMode] = useState("renforce"),
    [type, setType] = useState("text");
  const [value, setValue] = useState(""),
    [externalConsent, setExternalConsent] = useState(false),
    [keepContent, setKeepContent] = useState(false);
  const [report, setReport] = useState(null),
    [record, setRecord] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [history, setHistory] = useState([]),
    [menuOpen, setMenuOpen] = useState(false),
    [recover, setRecover] = useState(false),
    [showLimits, setShowLimits] = useState(false);
  const refresh = () =>
    api("/api/v1/history")
      .then((res) => setHistory(res.items))
      .catch(() => {});
  useEffect(() => {
    refresh();
  }, []);
  const navigate = (where) => {
    setPage(where);
    setMenuOpen(false);
    setError("");
    if (where === "history") refresh();
  };
  const launch = (which, pref = "") => {
    setType(which);
    setValue(pref);
    setReport(null);
    setRecord(null);
    navigate("analyze");
  };
  const submit = async (event) => {
    event?.preventDefault();
    if (!value.trim() || loading) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const url =
        type === "url" ? "/api/v1/analyze/url" : "/api/v1/analyze/text";
      const input =
        type === "url"
          ? {
              url: value.trim(),
              mode,
              keep_content: keepContent,
              external_consent: externalConsent,
            }
          : { text: value, mode, keep_content: keepContent };
      const result = await api(url, {
        method: "POST",
        body: JSON.stringify(input),
      });
      setReport(result.report);
      setRecord(result.record);
      refresh();
    } catch (e) {
      setError(e.message || "Échec de la vérification.");
    } finally {
      setLoading(false);
    }
  };
  const wipe = async () => {
    if (!window.confirm("Effacer définitivement tout l’historique local ?"))
      return;
    try {
      await api("/api/v1/history", { method: "DELETE" });
      setHistory([]);
    } catch (e) {
      setError(e.message);
    }
  };
  const openHistory = async (id) => {
    try {
      const data = await api("/api/v1/history/" + encodeURIComponent(id));
      const r = data.report;
      // Stored records are summaries: display only retained fields, no invented technical detail.
      setReport({
        ...r,
        checks:
          r.checks?.map((c) => ({
            ...c,
            detail: "Détail non conservé dans l’historique minimal.",
          })) || [],
        sources: [
          {
            name: "Archive locale",
            status: "effectué",
            detail: "Résumé conservé sans données brutes.",
          },
        ],
        recommendations: [
          "Pour une nouvelle vérification complète, lancez une nouvelle analyse.",
        ],
        collection: null,
      });
      setRecord(data);
      navigate("analyze");
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="app-shell">
      <div className="space-stars" />
      <Planet />
      <button
        className="mobile-menu icon-button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Ouvrir le menu"
      >
        <Menu />
      </button>
      <aside className={"sidebar glass " + (menuOpen ? "sidebar-open" : "")}>
        <Logo />
        <nav aria-label="Menu principal">
          {MENU.map((item) => {
            const I = item.icon;
            return (
              <button
                key={item.key}
                className={"nav-item " + (page === item.key ? "selected" : "")}
                onClick={() => navigate(item.key)}
              >
                <I size={21} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="pulse-dot" /> <strong>Mode à la demande</strong>
            <p>Aucune surveillance en arrière-plan.</p>
            <div className="mini-wave">∿∿∿∿∿∿∿∿∿∿∿</div>
          </div>
          <div className="sidebar-version">
            PASTATSHIELD <span>V{VERSION} • LOCALE</span>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="quick-search">
            <Search size={21} />
            <button onClick={() => launch("text")}>
              Analyse rapide : e-mail, SMS ou texte...
            </button>
            <button className="analyze-top" onClick={() => launch("text")}>
              Analyser <ArrowRight size={17} />
            </button>
          </div>
          <div className="top-actions">
            <span className="top-private">
              <LockKeyhole size={14} /> Local-first
            </span>
            <ShieldCheck size={23} />
          </div>
        </header>
        {page === "home" && (
          <div className="page-body">
            <div className="hero">
              <div className="eyebrow">
                <span className="violet-bullet" /> VOTRE CONSEILLER ANTI-ARNAQUE
              </div>
              <h1>
                Un doute ? <span>On vérifie.</span>
              </h1>
              <p>
                Analysez vos messages, vos liens et les sites web. Comprenez les
                risques et les preuves avant de faire confiance.
              </p>
              <button className="main-cta" onClick={() => launch("text")}>
                <Sparkles size={18} /> Lancer une analyse{" "}
                <ArrowRight size={17} />
              </button>
            </div>
            <div className="section-label">
              <span className="violet-bullet" /> MODULES D'ANALYSE{" "}
              <span className="section-right">
                7 modules • 4 parcours textuels / URL disponibles
              </span>
            </div>
            <div className="modules-grid">
              {MODULES.map((m) => {
                const I = m.icon;
                return (
                  <button
                    key={m.label}
                    disabled={!m.active}
                    className={
                      "module-card glass " +
                      m.accent +
                      (!m.active ? " disabled" : "")
                    }
                    onClick={() => launch(m.type)}
                  >
                    <div className="module-icon">
                      <I size={29} />
                    </div>
                    <strong>{m.label}</strong>
                    <small>{m.detail}</small>
                    <span
                      className={
                        "module-state " + (m.active ? "ready" : "soon")
                      }
                    >
                      <i />
                      {m.active ? "Disponible" : "V2 — prévu"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="content-grid">
              <section className="glass activity-panel">
                <div className="panel-title">
                  <div>
                    <span className="violet-bullet" /> HISTORIQUE RÉCENT
                  </div>
                  <button
                    className="text-link"
                    onClick={() => navigate("history")}
                  >
                    Voir tout <ChevronRight size={15} />
                  </button>
                </div>
                {history.length ? (
                  <div className="history-mini">
                    {history.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        className="history-item"
                        onClick={() => openHistory(item.id)}
                      >
                        <span className="history-ico">
                          {item.kind === "url" ? <Globe2 /> : <Mail />}
                        </span>
                        <span className="history-text">
                          <strong>
                            {item.kind === "url"
                              ? "Site / URL analysé"
                              : "Message analysé"}
                          </strong>
                          <small>{dateLabel(item.created_at)}</small>
                        </span>
                        <RiskChip risk={item.risk} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-history">
                    <Clock3 size={31} />
                    <strong>Aucune analyse pour le moment</strong>
                    <span>
                      Vos vérifications apparaîtront ici, sans conserver votre
                      message par défaut.
                    </span>
                  </div>
                )}
              </section>
              <section className="glass promise-panel">
                <div className="panel-title">
                  <div>
                    <span className="violet-bullet" /> CONFIANCE &
                    CONFIDENTIALITÉ
                  </div>
                </div>
                <h3>Votre sécurité, sans surveillance cachée.</h3>
                <p>
                  PastaTshield ne lit pas automatiquement vos messages,
                  n'exécute pas de fichiers suspects et n'envoie rien à une IA
                  externe.
                </p>
                <button
                  className="text-link"
                  onClick={() => setShowLimits(!showLimits)}
                >
                  {showLimits
                    ? "Masquer"
                    : "Ce que PastaTshield ne fait jamais"}{" "}
                  <ChevronDown size={15} />
                </button>
                {showLimits && (
                  <ul>
                    <li>Pas d'écoute ni de surveillance en arrière-plan.</li>
                    <li>Pas de blocage automatique de sites.</li>
                    <li>Pas de promesse de sécurité absolue.</li>
                    <li>Pas d'analyse de fichiers en V1.</li>
                  </ul>
                )}
              </section>
            </div>
            <button
              className="emergency-banner glass"
              onClick={() => setRecover(true)}
            >
              <HeartHandshake size={22} />
              <span>
                <strong>Vous avez déjà répondu à une arnaque ?</strong>
                <small>
                  Obtenez des premières étapes de protection adaptées.
                </small>
              </span>
              <ArrowRight size={19} />
            </button>
          </div>
        )}
        {page === "analyze" && (
          <div className="page-body analyze-page">
            <div className="page-heading">
              <div className="eyebrow">
                <span className="violet-bullet" /> VÉRIFICATION VOLONTAIRE
              </div>
              <h1>
                Analyser <span>en toute transparence</span>
              </h1>
              <p>
                Pas de jugement opaque : les résultats distinguent les constats,
                les inconnues et les conseils.
              </p>
            </div>
            {!report ? (
              <form className="glass analyze-form" onSubmit={submit}>
                <div className="form-tabs">
                  <button
                    type="button"
                    className={type === "text" ? "active" : ""}
                    onClick={() => setType("text")}
                  >
                    <Mail size={18} /> E-mail / SMS / texte
                  </button>
                  <button
                    type="button"
                    className={type === "url" ? "active" : ""}
                    onClick={() => setType("url")}
                  >
                    <Globe2 size={18} /> URL / site web
                  </button>
                </div>
                <label className="input-heading" htmlFor="target">
                  {type === "text"
                    ? "Collez ici le message suspect"
                    : "Adresse du site à examiner"}
                </label>
                {type === "text" ? (
                  <textarea
                    id="target"
                    rows="8"
                    maxLength="20000"
                    placeholder="Exemple : Votre colis est bloqué. Payez les frais de livraison immédiatement..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <input
                    id="target"
                    type="url"
                    maxLength="2048"
                    placeholder="https://exemple.fr/"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    autoFocus
                  />
                )}
                <p className="input-helper">
                  {type === "text"
                    ? "Règles locales FR/BE : urgence, demandes de codes, usurpation, liens et fraudes WhatsApp."
                    : "Inspection passive de l’URL publique et du HTML, sans exécuter de JavaScript ni charger de ressources externes."}
                </p>
                <div className="form-settings">
                  <div>
                    <label className="small-label" htmlFor="mode">
                      Niveau de vigilance
                    </label>
                    <select
                      id="mode"
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                    >
                      <option value="standard">Standard</option>
                      <option value="renforce">Renforcé (conseillé)</option>
                      <option value="maximum">Maximum</option>
                    </select>
                  </div>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={keepContent}
                      onChange={(e) => setKeepContent(e.target.checked)}
                    />
                    <span>
                      Conserver le texte / l'URL d'origine dans l'historique
                      local
                    </span>
                  </label>
                </div>
                {type === "url" && (
                  <label className="consent-box">
                    <input
                      type="checkbox"
                      checked={externalConsent}
                      onChange={(e) => setExternalConsent(e.target.checked)}
                    />
                    <span>
                      <strong>
                        Autoriser une consultation du registre RDAP
                      </strong>
                      <small>
                        La demande transmet le domaine à un service tiers. Sans
                        accord, seul le contrôle du site soumis est tenté.
                        VirusTotal et Safe Browsing ne sont pas encore
                        connectés.
                      </small>
                    </span>
                  </label>
                )}
                <div className="form-footer">
                  <span>
                    <LockKeyhole size={15} /> Analyse à la demande. Aucun envoi
                    à une IA.
                  </span>
                  <button
                    className="main-cta"
                    type="submit"
                    disabled={loading || !value.trim()}
                  >
                    {loading ? (
                      <span className="spinner" />
                    ) : (
                      <Search size={18} />
                    )}{" "}
                    {loading ? "Analyse en cours…" : "Lancer la vérification"}{" "}
                    <ArrowRight size={17} />
                  </button>
                </div>
                {error && (
                  <div className="error-msg" role="alert">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </form>
            ) : (
              <Report
                report={report}
                record={record}
                onBack={() => {
                  setReport(null);
                  setRecord(null);
                }}
              />
            )}
          </div>
        )}
        {page === "history" && (
          <div className="page-body">
            <div className="page-heading">
              <div className="eyebrow">
                <span className="violet-bullet" /> MÉMOIRE LOCALE
              </div>
              <h1>
                Historique <span>des vérifications</span>
              </h1>
              <p>
                Seuls les résumés et métadonnées sont conservés par défaut, sans
                votre contenu.
              </p>
            </div>
            <div className="glass history-page">
              <div className="panel-title">
                <strong>{history.length} analyse(s) enregistrée(s)</strong>
                <button
                  className="secondary-btn"
                  disabled={!history.length}
                  onClick={wipe}
                >
                  <Trash2 size={16} /> Effacer tout
                </button>
              </div>
              {history.length ? (
                history.map((item) => (
                  <button
                    key={item.id}
                    className="history-row"
                    onClick={() => openHistory(item.id)}
                  >
                    <div className="history-ico">
                      {item.kind === "url" ? <Globe2 /> : <MessageCircle />}
                    </div>
                    <div className="history-text">
                      <strong>{item.summary}</strong>
                      <small>
                        {item.kind === "url"
                          ? "Site web / URL"
                          : "E-mail / SMS / texte"}{" "}
                        • {dateLabel(item.created_at)}{" "}
                        {item.content_saved ? "• Contenu conservé" : ""}
                      </small>
                    </div>
                    <RiskChip risk={item.risk} />
                    <ChevronRight size={17} />
                  </button>
                ))
              ) : (
                <div className="empty-history">
                  <Clock3 size={32} />
                  <strong>Historique vide</strong>
                  <span>Vous n’avez pas encore lancé d’analyse.</span>
                </div>
              )}
            </div>
            {error && <p className="error-msg">{error}</p>}
          </div>
        )}
        {page === "protection" && (
          <div className="page-body">
            <div className="page-heading">
              <div className="eyebrow">
                <span className="violet-bullet" /> VOTRE PROTECTION
              </div>
              <h1>
                Une sécurité <span>qui respecte vos choix</span>
              </h1>
              <p>
                L'application agit uniquement quand vous demandez une analyse.
                Aucun agent caché.
              </p>
            </div>
            <div className="glass feature-page">
              <ShieldCheck className="feature-symbol" size={50} />
              <h2>Protection à la demande</h2>
              <div className="protection-items">
                <p>
                  <CheckCircle2 /> Analyse locale des règles de messages
                </p>
                <p>
                  <CheckCircle2 /> Consultation du site uniquement sur demande
                </p>
                <p>
                  <CheckCircle2 /> Aucun accès automatique à vos e-mails ou
                  appels
                </p>
                <p>
                  <Info /> Pas d'antivirus résident ni de protection temps réel
                  en V1
                </p>
              </div>
              <button className="main-cta" onClick={() => launch("text")}>
                Vérifier un message <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
        {page === "advice" && (
          <div className="page-body">
            <div className="page-heading">
              <div className="eyebrow">
                <span className="violet-bullet" /> CONSEILS FRANCE & BELGIQUE
              </div>
              <h1>
                Les bons réflexes <span>avant de cliquer</span>
              </h1>
            </div>
            <div className="advice-grid">
              {[
                [
                  "Banques et codes",
                  "Ne communiquez jamais un code de validation à un interlocuteur inattendu. Raccrochez et ouvrez votre application bancaire officielle.",
                ],
                [
                  "Colis et livraison",
                  "Méfiez-vous des petits frais de livraison demandés via des SMS non sollicités. Recherchez vous-même votre commande sur le site du transporteur.",
                ],
                [
                  "itsme et identités",
                  "Une demande d’identification itsme inattendue doit être refusée. Vérifiez toujours l’action et le service qui la réclame.",
                ],
                [
                  "Imitations de services publics",
                  "Les faux messages peuvent copier Ameli, La Poste, impots.gouv.fr, eBox ou MyMinfin. Vérifiez le domaine complet, pas seulement le logo.",
                ],
              ].map(([title, body]) => (
                <article className="glass advice-card" key={title}>
                  <BadgeCheck size={23} />
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
            <button
              className="emergency-banner glass"
              onClick={() => setRecover(true)}
            >
              <HeartHandshake />
              <span>
                <strong>J’ai déjà répondu</strong>
                <small>Consulter les premières mesures de protection</small>
              </span>
              <ArrowRight />
            </button>
          </div>
        )}
        {page === "settings" && (
          <div className="page-body">
            <div className="page-heading">
              <div className="eyebrow">
                <span className="violet-bullet" /> PARAMÈTRES
              </div>
              <h1>
                Contrôle et <span>confidentialité</span>
              </h1>
            </div>
            <div className="glass feature-page settings-page">
              <h2>Niveau de vigilance par défaut</h2>
              <p>
                Ces modes modifient uniquement les vérifications proposées,
                jamais vos permissions.
              </p>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="standard">Standard</option>
                <option value="renforce">Renforcé (conseillé)</option>
                <option value="maximum">Maximum</option>
              </select>
              <h2>Historique local</h2>
              <p>
                Résumé conservé par défaut. Vous pouvez effacer tous les
                enregistrements locaux.
              </p>
              <button className="secondary-btn" onClick={wipe}>
                <Trash2 size={16} /> Effacer l’historique
              </button>
              <h2>Ce que PastaTshield ne fait jamais</h2>
              <ul>
                <li>Pas de surveillance cachée des e-mails, SMS ou appels.</li>
                <li>Pas d'envoi automatique à une IA externe.</li>
                <li>Pas d'exécution des fichiers suspects.</li>
                <li>Pas de blocage automatique de sites.</li>
                <li>Pas de promesse de risque zéro.</li>
              </ul>
              <p className="muted small">
                Version {VERSION} • Développement local • France / Belgique
              </p>
            </div>
          </div>
        )}
        <footer className="app-footer">
          <span>
            <Shield size={14} /> PastaTshield V{VERSION} — Un doute ? On
            vérifie.
          </span>
          <span>Absence de détection ≠ sécurité garantie.</span>
        </footer>
      </main>
      {recover && <Recover close={() => setRecover(false)} />}
    </div>
  );
}
export default App;
