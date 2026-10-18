import React, { useEffect, useState } from "react";
import PRODUCT from "../../version.json";
import PasswordManager from "./PasswordManager.jsx";
import TShieldIcon from "./TShieldIcon.jsx";
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
  KeyRound,
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
  { key: "passwords", label: "Mots de passe", icon: KeyRound },
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
    label: "Message",
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
function ModuleCard({ module, onLaunch }) {
  const Icon = module.icon;
  return (
    <button
      type="button"
      disabled={!module.active}
      className={
        "module-card glass " + (module.active ? "available" : "upcoming")
      }
      onClick={() => onLaunch(module.type)}
      aria-label={
        module.active
          ? module.label + " : lancer une analyse"
          : module.label + " : bientôt disponible en V2"
      }
    >
      <div className="module-icon">
        <Icon size={27} />
      </div>
      <strong>{module.label}</strong>
      <small>{module.detail}</small>
      <span className={"module-state " + (module.active ? "ready" : "soon")}>
        <i aria-hidden="true" />
        {module.active ? "Disponible" : "Bientôt"}
      </span>
    </button>
  );
}

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
    <div className="logo brand-lockup" aria-label="PastaTshield">
      <span className="brand-mark" aria-hidden="true">
        <TShieldIcon size={28} />
      </span>
      <span className="brand-wordmark">
        Pasta<strong>T</strong>shield
      </span>
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
  const [view, setView] = useState("simple");
  if (!report) return null;

  const isUrl = report.kind === "url";
  const checks = report.checks || [];
  const findings = report.findings || [];
  const privacy = report.collection;
  const redirectCheck = checks.find((c) => c.name === "Redirections");
  const pageCheck = checks.find((c) => c.name === "HTML et formulaires");
  const connectionCheck = checks.find((c) => c.name === "Connexion au site");
  const ageCheck = checks.find((c) => c.name?.includes("RDAP"));
  const pageInspected = pageCheck?.status === "effectué";
  const connectionVerified = connectionCheck?.status === "effectué";
  const lastDestination = report.redirects?.at(-1)?.url || "";
  const friendlyTitles = {
    "Traceurs identifiés": "Outils de suivi repérés",
    "Redirections à examiner": "Changement d’adresse à vérifier",
    "Redirection non chiffrée": "Le site quitte une connexion chiffrée",
    "Connexion non chiffrée": "Connexion non protégée",
    "Domaine différent de l'organisme cité":
      "L’adresse ne correspond pas à l’organisme annoncé",
    "Multiples destinations": "Plusieurs liens vers des sites différents",
    "Prise de contrôle à distance": "Un accès à votre ordinateur est demandé",
    "Domaine très récent": "Le site est très récent",
    "Domaine récent": "Le site a été créé récemment",
    "Lien raccourci": "L’adresse du lien est masquée",
    "Invitation WhatsApp à vérifier":
      "Une invitation à discuter mérite votre attention",
  };
  const positives = [];

  if (isUrl && connectionVerified && lastDestination.startsWith("https://")) {
    positives.push({
      title: "Connexion chiffrée",
      detail:
        "Cette visite de vérification a utilisé une connexion HTTPS. Cela ne garantit pas que le commerce est fiable.",
    });
  }
  if (
    isUrl &&
    redirectCheck?.status === "effectué" &&
    report.redirects?.length === 1
  ) {
    positives.push({
      title: "Pas de redirection observée",
      detail: "La page n’a pas changé d’adresse durant notre vérification.",
    });
  }
  if (
    isUrl &&
    pageInspected &&
    privacy &&
    !privacy.data_requested?.includes("Mot de passe")
  ) {
    positives.push({
      title: "Aucun mot de passe demandé dans la page examinée",
      detail:
        "Aucun champ de mot de passe n’a été repéré dans le code public reçu. D’autres pages peuvent en demander.",
    });
  }
  if (!isUrl && findings.length === 0 && report.risk === "Faible") {
    positives.push({
      title: "Aucun signal habituel repéré",
      detail:
        "Les règles locales appliquées à ce message n’ont pas déclenché d’alerte. L’identité de l’expéditeur reste inconnue.",
    });
  }

  const messages = {
    Critique: {
      heading: "DANGER IMPORTANT",
      action:
        "N’envoyez aucun code, mot de passe ou paiement. Vérifiez directement auprès de l’organisme officiel.",
    },
    Élevé: {
      heading: "DANGER POSSIBLE",
      action:
        "Ne cliquez pas et ne donnez aucune information personnelle avant une vérification indépendante.",
    },
    Modéré: {
      heading: "PRUDENCE RECOMMANDÉE",
      action:
        "Vérifiez l’identité du site ou de l’expéditeur avant de communiquer des données personnelles.",
    },
    Faible: {
      heading: "AUCUNE ALERTE MAJEURE REPÉRÉE",
      action:
        "Restez vigilant : les contrôles réalisés ne prouvent pas que ce contenu est sans danger.",
    },
    Indéterminé: {
      heading: "VÉRIFICATION INCOMPLÈTE",
      action:
        "Nous n’avons pas assez d’informations pour conclure. Vérifiez par un canal officiel indépendant.",
    },
  };
  const headline = messages[report.risk] || messages.Indéterminé;
  const copy = () => {
    const lines = [
      "PastaTshield — Bilan de sécurité",
      headline.heading,
      report.summary,
      "Recommandations:",
      ...(report.recommendations || []).map((r) => "- " + r),
      "Indicateurs:",
      ...findings.map((f) => "- " + f.title + " : " + f.reason),
      "Contrôles:",
      ...checks.map((c) => "- " + c.name + " : " + c.status + " — " + c.detail),
      "Sources:",
      ...(report.sources || []).map(
        (s) => "- " + s.name + " : " + s.status + " — " + s.detail,
      ),
      "Limites:",
      ...(report.limitations || []),
      "Absence de détection ≠ sécurité garantie.",
    ];
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
  };

  return (
    <section className="report-panel glass report-readable" aria-live="polite">
      <div className="panel-heading">
        <div className="heading-icon">
          <Activity size={20} />
        </div>
        <div>
          <span className="overline">BILAN DE SÉCURITÉ</span>
          <h2>Votre résultat</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Retour à l’analyse"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </button>
      </div>
      <div
        className={
          "risk-overview risk-hero " + (riskClass[report.risk] || "unknown")
        }
        role="status"
      >
        <div className="risk-emblem" aria-hidden="true">
          {report.risk === "Faible" ? (
            <CheckCircle2 size={32} />
          ) : report.risk === "Indéterminé" ? (
            <Info size={32} />
          ) : (
            <AlertTriangle size={32} />
          )}
        </div>
        <div>
          <p className="verdict-label">{headline.heading}</p>
          <h3>{report.summary}</h3>
          <p className="verdict-action">{headline.action}</p>
        </div>
      </div>
      <div
        className="report-view-switch"
        role="group"
        aria-label="Niveau de détail"
      >
        <button
          type="button"
          className={view === "simple" ? "selected" : ""}
          aria-pressed={view === "simple"}
          onClick={() => setView("simple")}
        >
          Vue simple
        </button>
        <button
          type="button"
          className={view === "expert" ? "selected" : ""}
          aria-pressed={view === "expert"}
          onClick={() => setView("expert")}
        >
          Vue experte
        </button>
      </div>
      {view === "simple" ? (
        <>
          <div className="health-cards">
            <div className="health-card health-positive">
              <h3>
                <CheckCircle2 size={22} /> Les bons points observés
              </h3>
              {positives.length ? (
                positives.map((p, i) => (
                  <div className="plain-finding" key={i}>
                    <strong>{p.title}</strong>
                    <p>{p.detail}</p>
                  </div>
                ))
              ) : (
                <p className="no-positives">
                  Aucun point rassurant n’a pu être établi avec les contrôles
                  disponibles.
                </p>
              )}
            </div>
            <div className="health-card health-attention">
              <h3>
                <AlertTriangle size={22} /> Ce qu’il faut savoir
              </h3>
              {findings.map((f, i) => (
                <div className="plain-finding" key={i}>
                  <strong>{friendlyTitles[f.title] || f.title}</strong>
                  <p>{f.reason}</p>
                </div>
              ))}
              {isUrl && privacy && pageInspected && (
                <>
                  <div className="plain-finding">
                    <strong>Outils de suivi</strong>
                    <p>
                      {(privacy.known_trackers || []).length
                        ? privacy.known_trackers.length +
                          " service(s) de suivi référencé(s) dans la page. Leur fonctionnement réel n’a pas été vérifié."
                        : "Aucun outil de suivi connu n’a été identifié parmi les ressources référencées."}
                    </p>
                  </div>
                  <div className="plain-finding">
                    <strong>Cookies et services extérieurs</strong>
                    <p>
                      La réponse reçue a déclaré {privacy.observed_cookies || 0}{" "}
                      cookie(s). {privacy.third_party_domains?.length || 0}{" "}
                      domaine(s) extérieur(s) ont été référencés dans le code
                      public.
                    </p>
                  </div>
                  {privacy.data_requested?.length > 0 && (
                    <div className="plain-finding">
                      <strong>Informations demandées sur cette page</strong>
                      <p>
                        {privacy.data_requested.join(", ")}. Leur transmission
                        n’a pas été observée.
                      </p>
                    </div>
                  )}
                </>
              )}
              {isUrl && (
                <div className="plain-finding">
                  <strong>Âge du site</strong>
                  <p>
                    {ageCheck?.status === "effectué"
                      ? "Date d’enregistrement consultée. " +
                        ageCheck.detail.replace(/Enregistrement\s*:/, "Date :")
                      : "Non vérifié pour le moment. Les sites frauduleux utilisent parfois des noms de domaine très récents."}
                  </p>
                </div>
              )}
              {!findings.length && !isUrl && (
                <p>
                  Le message ne présente aucun des indices habituels recherchés
                  par nos règles locales.
                </p>
              )}
              {report.risk === "Indéterminé" && (
                <p className="unknown-advice">
                  Certaines vérifications n’ont pas abouti. Ne considérez pas ce
                  résultat comme une autorisation de continuer.
                </p>
              )}
            </div>
          </div>
          <div className="recommendation-panel">
            <h3>
              <ListChecks size={21} /> Ce que nous vous conseillons
            </h3>
            <ol>
              {(report.recommendations || []).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </div>
          <p className="report-caution">
            <Shield size={18} />
            PastaTshield examine uniquement les éléments accessibles pendant
            cette vérification. Il ne peut pas garantir que le site ou le
            message est sûr à 100 %.
          </p>
        </>
      ) : (
        <>
          <div className="report-grid">
            <div className="report-section">
              <h3>
                <AlertTriangle size={17} /> Indicateurs techniques (
                {findings.length})
              </h3>
              {findings.length ? (
                findings.map((f, i) => (
                  <div className="finding" key={i}>
                    <span
                      className={
                        "finding-severity " +
                        (riskClass[f.severity] || "unknown")
                      }
                    >
                      {f.severity}
                    </span>
                    <strong>{f.title}</strong>
                    <p>{f.reason}</p>
                    {f.evidence && <small>Indice : {f.evidence}</small>}
                  </div>
                ))
              ) : (
                <div className="soft-note">
                  Aucun indicateur détecté par les règles appliquées.
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
            </div>
          </div>
          {isUrl && privacy && (
            <div className="collection-card">
              <h3>
                <Eye size={18} /> Collecte potentielle — HTML statique
              </h3>
              <p>
                Éléments référencés, sans exécuter de JavaScript ni prouver la
                transmission des données.
              </p>
              <div className="collection-grid">
                <span>Champs repérés</span>
                <strong>
                  {privacy.data_requested?.join(", ") ||
                    "Aucun champ sensible identifié"}
                </strong>
                <span>Formulaires</span>
                <strong>{privacy.form_count}</strong>
                <span>Domaines tiers référencés</span>
                <strong>
                  {privacy.third_party_domains?.join(", ") || "Aucun repéré"}
                </strong>
                <span>Traceurs connus référencés</span>
                <strong>
                  {privacy.known_trackers?.join(", ") || "Aucun repéré"}
                </strong>
                <span>Cookies déclarés</span>
                <strong>{privacy.observed_cookies || 0}</strong>
                <span>Transmissions observées</span>
                <strong>Aucune sous-ressource exécutée</strong>
              </div>
              <p className="caution-small">
                Non vérifié : {privacy.not_observed}
              </p>
            </div>
          )}
          <div className="evidence">
            <div className="report-section">
              <h3>
                <CheckCircle2 size={17} /> Ce qui a été vérifié
              </h3>
              {checks.map((x, i) => (
                <div className="evidence-line" key={i}>
                  <span
                    className={
                      x.status === "effectué" ? "state-yes" : "state-no"
                    }
                  >
                    {x.status}
                  </span>
                  <strong>{x.name}</strong>
                  <p>{x.detail}</p>
                </div>
              ))}
            </div>
            <div className="report-section">
              <h3>
                <Globe2 size={17} /> Sources utilisées ou indisponibles
              </h3>
              {(report.sources || []).map((x, i) => (
                <div className="evidence-line" key={i}>
                  <span
                    className={
                      x.status === "effectué" ? "state-yes" : "state-no"
                    }
                  >
                    {x.status}
                  </span>
                  <strong>{x.name}</strong>
                  <p>{x.detail}</p>
                </div>
              ))}
            </div>
            <div className="report-section">
              <h3>
                <Info size={17} /> Limites et contrôles impossibles
              </h3>
              <ul>
                {(report.limitations || []).map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
      <div className="report-actions-bottom">
        <button className="secondary-btn" onClick={copy}>
          <Copy size={16} /> Copier le rapport complet
        </button>
      </div>
      <div className="report-footnote">
        <LockKeyhole size={15} /> Analyse à la demande. Absence de détection ≠
        sécurité garantie.
        {record?.created_at &&
          " Enregistrée le " + dateLabel(record.created_at) + "."}
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
    [recover, setRecover] = useState(false);
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
          <span className="mobile-brand" aria-label="PastaTshield">
            <TShieldIcon size={25} />
          </span>
          {page === "analyze" ? (
            <div className="quick-search quick-search-static">
              <LockKeyhole size={18} />
              <span>
                Vérification volontaire — aucun contenu analysé en arrière-plan
              </span>
            </div>
          ) : (
            <div className="quick-search">
              <Search size={21} />
              <button type="button" onClick={() => launch("text")}>
                Vérifier un message ou un lien...
              </button>
            </div>
          )}
          <div className="top-actions">
            <span className="top-private">
              <LockKeyhole size={14} /> Traitement local
            </span>
            <ShieldCheck size={23} />
          </div>
        </header>
        {page === "home" && (
          <div className="page-body">
            <div className="hero">
              <span className="hero-mobile-name">PastaTshield</span>
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
              <span className="violet-bullet" /> MODULES DISPONIBLES
              <span className="section-right">
                4 parcours d’analyse, à votre demande
              </span>
            </div>
            <div className="modules-grid active-modules">
              {MODULES.filter((m) => m.active).map((m) => (
                <ModuleCard key={m.label} module={m} onLaunch={launch} />
              ))}
            </div>
            <div className="upcoming-head">
              <span>BIENTÔT — VERSION 2</span>
              <small>Fonctionnalités prévues, non activées</small>
            </div>
            <div className="modules-grid upcoming-modules">
              {MODULES.filter((m) => !m.active).map((m) => (
                <ModuleCard key={m.label} module={m} onLaunch={launch} />
              ))}
            </div>
            <div
              className={
                "content-grid " + (!history.length ? "history-empty" : "")
              }
            >
              <section
                className={
                  "glass activity-panel " + (!history.length ? "is-empty" : "")
                }
              >
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
                  <div className="empty-history compact-empty">
                    <Clock3 size={20} />
                    <span>
                      <strong>Aucune analyse pour le moment.</strong> Vos
                      vérifications apparaîtront ici.
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
                <h3>Vos données, vos décisions.</h3>
                <ul className="trust-list">
                  <li>Pas de surveillance cachée.</li>
                  <li>Pas d’exécution de fichiers suspects.</li>
                  <li>Pas d’envoi automatique à une IA externe.</li>
                  <li>Aucune garantie de sécurité absolue.</li>
                </ul>
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
                    <Mail size={18} /> E-mail / message / texte
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
                    rows="5"
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
                    ? "Cherche les signes de fraude les plus fréquents en France et en Belgique, sans envoyer votre message à une IA."
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
                        Consulter l’âge du site auprès d’un registre public
                      </strong>
                      <small>
                        Si vous cochez cette option, le nom du site sera envoyé
                        à un registre public pour rechercher sa date de
                        création. Les autres contrôles de réputation ne sont pas
                        encore disponibles.
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
            <div
              className={
                "glass history-page " + (!history.length ? "is-empty" : "")
              }
            >
              <div className="panel-title history-title-row">
                <strong>
                  {history.length}{" "}
                  {history.length === 1
                    ? "analyse enregistrée"
                    : "analyses enregistrées"}
                </strong>
                <button
                  type="button"
                  className="icon-button clear-history"
                  disabled={!history.length}
                  onClick={wipe}
                  aria-label="Effacer tout l’historique local"
                  title="Effacer tout l’historique"
                >
                  <Trash2 size={17} />
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
                          : "E-mail / message / texte"}{" "}
                        • {dateLabel(item.created_at)}{" "}
                        {item.content_saved ? "• Contenu conservé" : ""}
                      </small>
                    </div>
                    <RiskChip risk={item.risk} />
                    <ChevronRight size={17} />
                  </button>
                ))
              ) : (
                <div className="empty-history compact-empty">
                  <Clock3 size={20} />
                  <span>
                    Aucune analyse enregistrée. Les prochaines vérifications
                    apparaîtront ici.
                  </span>
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
            <div className="glass feature-page protection-page">
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
        {page === "passwords" && <PasswordManager api={api} />}
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
              <section className="settings-group">
                <div className="settings-heading">
                  <ShieldCheck size={20} />
                  <h2>Niveau de vigilance</h2>
                </div>
                <p>
                  Choisissez la profondeur des vérifications. Ce réglage ne
                  modifie pas les permissions.
                </p>
                <label className="small-label" htmlFor="default-mode">
                  Mode par défaut
                </label>
                <select
                  id="default-mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="standard">Standard</option>
                  <option value="renforce">Renforcé (conseillé)</option>
                  <option value="maximum">Maximum</option>
                </select>
              </section>
              <section className="settings-group">
                <div className="settings-heading">
                  <Clock3 size={20} />
                  <h2>Historique local</h2>
                </div>
                <p>
                  Vos analyses sont résumées localement. Effacez l’historique et
                  le cache RDAP quand vous le souhaitez.
                </p>
                <button className="secondary-btn" onClick={wipe}>
                  <Trash2 size={16} /> Effacer l’historique
                </button>
              </section>
              <section className="settings-group settings-info">
                <div className="settings-heading">
                  <Info size={20} />
                  <h2>Ce que PastaTshield ne fait jamais</h2>
                </div>
                <ul>
                  <li>
                    Pas de surveillance cachée des e-mails, SMS ou appels.
                  </li>
                  <li>Pas d’envoi automatique de contenus à une IA externe.</li>
                  <li>Pas d’exécution des fichiers suspects.</li>
                  <li>Pas de blocage automatique de sites.</li>
                  <li>Pas de promesse de risque zéro.</li>
                </ul>
              </section>
              <p className="settings-version">
                PastaTshield V{VERSION} · Version alpha locale · France /
                Belgique
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
