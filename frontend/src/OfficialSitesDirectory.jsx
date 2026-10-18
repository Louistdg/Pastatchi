import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  ClipboardCopy,
  ExternalLink,
  Globe2,
  Info,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { searchOfficialSites } from "./officialSearch.js";

const REGIONS = [
  { id: "all", label: "Tous les sites" },
  { id: "France", label: "France" },
  { id: "Belgique", label: "Belgique" },
];

const displayDate = (value) => {
  const date = new Date(value + "T12:00:00");
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("fr-BE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
};

function OfficialSiteCard({ site, onCopy, copiedId }) {
  const isCopied = copiedId === site.id;
  return (
    <article className="official-site-card glass">
      <div className="official-site-card-header">
        <span className="official-site-letter" aria-hidden="true">
          {site.name.charAt(0).toUpperCase()}
        </span>
        <div className="official-site-heading">
          <h3>{site.name}</h3>
          <span className="official-site-meta">
            {site.country} · {site.category}
          </span>
        </div>
      </div>
      <p className="official-site-description">{site.description}</p>
      <label
        className="official-site-address-label"
        htmlFor={"official-url-" + site.id}
      >
        Adresse à copier
      </label>
      <input
        id={"official-url-" + site.id}
        className="official-site-address"
        readOnly
        value={site.url}
        title="Sélectionner pour copier manuellement si besoin"
        onFocus={(event) => event.currentTarget.select()}
      />
      <div className="official-site-actions">
        <button
          type="button"
          className="primary-action official-site-copy"
          onClick={() => onCopy(site)}
          aria-label={"Copier l'adresse de " + site.name}
        >
          {isCopied ? (
            <Check size={19} aria-hidden="true" />
          ) : (
            <ClipboardCopy size={19} aria-hidden="true" />
          )}
          {isCopied ? "Adresse copiée" : "Copier ce lien"}
        </button>
        <a
          className="official-site-source"
          href={site.source_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            "Consulter la source pour " + site.name + " (ouvre un site externe)"
          }
        >
          Source <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>
      <p className="official-site-review-note">
        <ShieldCheck size={16} aria-hidden="true" /> Adresse documentée dans
        notre répertoire local.
      </p>
    </article>
  );
}

export default function OfficialSitesDirectory({ api }) {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    api("/api/v1/official-sites")
      .then((response) => {
        setData(response);
      })
      .catch((reason) => {
        setError(reason?.message || "Impossible de lire le répertoire local.");
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [api]);

  const result = useMemo(
    () => searchOfficialSites(data?.sites || [], query, country),
    [data, query, country],
  );

  async function copyAddress(site) {
    try {
      await navigator.clipboard.writeText(site.url);
      setCopiedId(site.id);
      setCopyFeedback(
        "Adresse de " +
          site.name +
          " copiée. Vérifie le domaine dans ton navigateur avant de saisir des informations.",
      );
    } catch {
      setCopiedId(null);
      setCopyFeedback(
        "Copie non autorisée. Sélectionne l'adresse affichée et copie-la manuellement.",
      );
    }
  }

  return (
    <div className="page-body official-sites-page">
      <div className="page-heading">
        <div className="eyebrow">
          <span className="violet-bullet" /> RÉPERTOIRE LOCAL FRANCE & BELGIQUE
        </div>
        <h1>
          Trouver un <span>site officiel</span>
        </h1>
        <p>
          Impôts, santé, colis, retraite… Retrouve une adresse de référence sans
          passer par les résultats d’un moteur de recherche.
        </p>
      </div>

      <section className="official-directory-intro glass">
        <div className="official-intro-icon">
          <Globe2 size={25} aria-hidden="true" />
        </div>
        <div>
          <h2>Une adresse pour partir du bon endroit</h2>
          <p>
            Recherche dans une liste préparée à l’avance. Tes mots-clés restent
            dans cette application : aucune recherche Google, aucun envoi à un
            service externe.
          </p>
        </div>
      </section>

      <section
        className="official-directory-controls"
        aria-label="Rechercher un organisme"
      >
        <label
          className="official-site-search-label"
          htmlFor="official-site-search"
        >
          Quel organisme cherches-tu ?
        </label>
        <div className="official-site-search">
          <Search size={22} aria-hidden="true" />
          <input
            type="search"
            id="official-site-search"
            value={query}
            maxLength={80}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setCopiedId(null);
              setCopyFeedback("");
            }}
            placeholder="Ex. : ameli, impôts, colis, itsme…"
          />
        </div>
        <div
          className="official-region-filters"
          role="group"
          aria-label="Filtrer les pays"
        >
          {REGIONS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={country === item.id ? "selected" : ""}
              aria-pressed={country === item.id}
              onClick={() => {
                setCountry(item.id);
                setCopiedId(null);
                setCopyFeedback("");
              }}
            >
              <MapPin size={16} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {copyFeedback && (
        <div className="official-copy-feedback" role="status">
          <Info size={19} aria-hidden="true" />
          {copyFeedback}
        </div>
      )}

      {loading ? (
        <div className="official-site-state glass" role="status">
          Ouverture du répertoire local…
        </div>
      ) : error ? (
        <div className="official-site-state glass" role="alert">
          <AlertCircle size={24} aria-hidden="true" />
          <p>{error}</p>
          <button type="button" className="outline-action" onClick={load}>
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <div className="official-site-results-heading">
            <h2>
              {result.sites.length} adresse{result.sites.length > 1 ? "s" : ""}{" "}
              dans le répertoire
            </h2>
            <span>Revue documentaire : {displayDate(data.reviewed_on)}</span>
          </div>
          {result.sites.length ? (
            <div className="official-sites-grid">
              {result.sites.map((site) => (
                <OfficialSiteCard
                  key={site.id}
                  site={site}
                  onCopy={copyAddress}
                  copiedId={copiedId}
                />
              ))}
            </div>
          ) : (
            <div className="official-site-empty glass">
              <BookOpen size={32} aria-hidden="true" />
              <h3>Aucune adresse trouvée dans notre répertoire</h3>
              <p>
                Ce n’est pas un jugement sur l’organisme recherché. Notre liste
                est limitée et peut être incomplète.
              </p>
              {result.suggestion && (
                <button
                  type="button"
                  className="outline-action"
                  onClick={() => setQuery(result.suggestion.query)}
                >
                  Vouliez-vous dire « {result.suggestion.query} » ?
                </button>
              )}
              <p>
                Ne te fie pas à un lien reçu par message. Pour une démarche
                sensible, vérifie l’adresse auprès de l’organisme par un autre
                canal.
              </p>
            </div>
          )}
        </>
      )}

      <div className="official-directory-caution">
        <ShieldCheck size={21} aria-hidden="true" />
        <p>
          <strong>À savoir :</strong> les adresses sont documentées à la date
          indiquée, mais ne sont pas contrôlées en direct. Elles peuvent
          changer. Une adresse recensée ne garantit pas que le site est sans
          faille, ni qu’un message reçu en son nom est authentique. Cliquer sur
          « Source » ouvre volontairement un site externe ; « Copier » ne
          l’ouvre pas.
        </p>
      </div>
    </div>
  );
}
