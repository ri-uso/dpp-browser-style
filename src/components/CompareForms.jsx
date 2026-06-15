import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, QrCode, Globe, Mail, Phone, MapPin } from "lucide-react";
import { getApiUrl, getDirectImageUrl } from '../utilities.jsx';
import "../styles/CompareForms.css";

/* --------- helpers --------- */
function pickDatum(product, id, lang) {
  if (!product?.data) return null;
  const list = product.data.filter((d) => d.ID === id);
  if (!list.length) return null;
  const langLc = (lang || "").toLowerCase();
  return list.find((d) => (d.property_language || "").toLowerCase() === langLc) || list[0];
}

function normalize(valueObj) {
  if (!valueObj) return "";
  if (valueObj.value_url)
    return (valueObj.value_text || valueObj.value_url || "").trim().toLowerCase();
  if (valueObj.value_text) return valueObj.value_text.trim().toLowerCase();
  if (valueObj.value_number != null) return String(valueObj.value_number).trim();
  return "";
}

function shapeValue(d, forceLinkIds = new Set(["CERT_AMBIENTALE"])) {
  if (!d) return { kind: "empty" };

  if (d.value_url) {
    const url = d.value_url;
    const given = (d.value_text || "").trim();
    const urlish = /^https?:\/\//i.test(given);
    const label = forceLinkIds.has(d.ID) ? "Link" : given && !urlish ? given : "Link";
    return { kind: "link", url, label };
  }

  if (d.value_text) return { kind: "text", text: d.value_text };
  if (d.value_number != null) {
    const u = d.value_number_unit_of_measure ? ` ${d.value_number_unit_of_measure}` : "";
    return { kind: "text", text: `${d.value_number}${u}` };
  }
  return { kind: "empty" };
}

function Cell({ value }) {
  if (!value || value.kind === "empty") return <span className="cmp-muted">—</span>;
  if (value.kind === "link") {
    return (
      <a className="cmp-link" href={value.url} target="_blank" rel="noopener noreferrer">
        {value.label}
      </a>
    );
  }
  return <span>{value.text}</span>;
}
Cell.propTypes = { value: PropTypes.any };

/* Cella per batch/item/famiglia con nome + codice + descrizione (testo piatto) */
function SummaryCell({ name, code, description, uom }) {
  const isEmpty = !name && !code && !description;
  if (isEmpty) return <span className="cmp-muted">—</span>;
  return (
    <div className="cmp-summary-cell">
      {name && <span className="cmp-summary-name">{name}</span>}
      {code && <span className="cmp-summary-code">{code}</span>}
      {uom && <span className="cmp-summary-meta">{uom}</span>}
      {description && <span className="cmp-summary-desc">{description}</span>}
    </div>
  );
}
SummaryCell.propTypes = {
  name: PropTypes.string,
  code: PropTypes.string,
  description: PropTypes.string,
  uom: PropTypes.string,
};

/* --------- main (multi-prodotto) --------- */
export default function CompareForms({ dataList, language, setShowCompare = () => {}, onAddProduct = () => {}, loadNewElement }) {

  const railRef = useRef(null);
  const sentinelRef = useRef(null);
  const cmpHeaderRef = useRef(null);
  const [railStuck, setRailStuck] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [cmpHeaderHeight, setCmpHeaderHeight] = useState(0);

  useEffect(() => {
    function measure() {
      const mainHeader = document.querySelector(".main-header");
      if (mainHeader) {
        const pos = getComputedStyle(mainHeader).position;
        setHeaderHeight(pos === "fixed" ? mainHeader.getBoundingClientRect().height : 0);
      } else {
        setHeaderHeight(0);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    function measureCmpHeader() {
      if (cmpHeaderRef.current) {
        setCmpHeaderHeight(cmpHeaderRef.current.getBoundingClientRect().height);
      }
    }
    measureCmpHeader();
    window.addEventListener("resize", measureCmpHeader);
    return () => window.removeEventListener("resize", measureCmpHeader);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { setRailStuck(!entry.isIntersecting); },
      { threshold: 0, rootMargin: `-${headerHeight}px 0px 0px 0px` }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [headerHeight]);

  const products = (Array.isArray(dataList) ? dataList : []).filter(Boolean);
  if (products.length < 2) {
    return (
      <div className="cmp-wrap">
        <p className="cmp-muted">Seleziona almeno due prodotti da confrontare.</p>
      </div>
    );
  }

  const forms = Array.isArray(products[0]?.forms) ? products[0].forms : [];
  const titles = products.map(
    (p) => p?.summary?.item_name || p?.summary?.item_code || "Prodotto"
  );
  const summaries = products.map(p => p?.summary ?? {});

  /* diff check per campi summary */
  const hasBatch   = summaries.some(s => s.batch_code);
  const hasItem    = summaries.some(s => s.item_code || s.item_name || s.item_description);
  const hasFamily  = summaries.some(s => s.productfamily_code || s.productfamily_name || s.productfamily_description);

  const batchDiff  = new Set(summaries.map(s => s.batch_code  || "")).size > 1;
  const itemDiff   = new Set(summaries.map(s => s.item_code   || "")).size > 1;
  const familyDiff = new Set(summaries.map(s => s.productfamily_code || "")).size > 1;

  /* ── Rendering per form_name speciali ── */

  const renderLogoSection = (section, sIdx) => {
    const fields = Array.isArray(section.fields) ? section.fields : [];
    return (
      <section className="cmp-section cmp-section--logo" key={`sec-${sIdx}`}>
        <div className="cmp-row" role="row" style={{ "--cols": products.length }}>
          <div className="cmp-cell feat-col" role="cell" />
          <div className="cmp-prods">
            {products.map((p, pi) => {
              const logoField = fields
                .map(f => p.data?.find(d => String(d.ID) === String(f.ID)))
                .find(d => d?.value_url_type?.toUpperCase() === 'IMAGE');
              return (
                <div className="cmp-cell prod-col cmp-logo-col" role="cell" key={`logo-${pi}`}>
                  {logoField
                    ? <img src={getDirectImageUrl(logoField.value_url)} alt="Logo" className="cmp-logo-img" />
                    : <span className="cmp-muted">—</span>
                  }
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  const renderHeaderSection = (section, sIdx) => {
    const fields = Array.isArray(section.fields) ? section.fields : [];
    const stickyTop = headerHeight + cmpHeaderHeight;
    return (
      <section
        className="cmp-section cmp-section--header"
        key={`sec-${sIdx}`}
        style={{ top: `${stickyTop}px` }}
      >
        {fields.map((f, idx) => {
          const id = f.ID;
          const normVals = products.map((p) => normalize(pickDatum(p, id, language)));
          const isDiff = new Set(normVals).size > 1;
          let label = id;
          for (const p of products) {
            const d = pickDatum(p, id, language);
            if (d?.label) { label = d.label; break; }
          }
          return (
            <div
              className={`cmp-row cmp-row--header${isDiff ? " is-diff" : ""}`}
              key={`hrow-${sIdx}-${id}-${idx}`}
              role="row"
              style={{ "--cols": products.length }}
            >
              <div className="cmp-cell feat-col" role="cell">
                <span className="cmp-feat-label">{label}</span>
              </div>
              <div className="cmp-prods">
                {products.map((p, pi) => (
                  <div className="cmp-cell prod-col" role="cell" key={`hc-${sIdx}-${id}-${pi}`}>
                    <Cell value={shapeValue(pickDatum(p, id, language))} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    );
  };

  const renderBatchItemFamilySection = (section, sIdx) => {
    const extraFields = Array.isArray(section.fields) ? section.fields : [];
    return (
      <section className="cmp-section" key={`sec-${sIdx}`}>
        <div className="cmp-sec-title">
          <span className="cmp-sec-title-span">Prodotto</span>
        </div>

        {hasBatch && (
          <div className={`cmp-row${batchDiff ? " is-diff" : ""}`} role="row" style={{ "--cols": products.length }}>
            <div className="cmp-cell feat-col" role="cell">
              <span className="cmp-feat-label">Lotto</span>
            </div>
            <div className="cmp-prods">
              {summaries.map((s, i) => (
                <div className="cmp-cell prod-col" role="cell" key={`batch-${i}`}>
                  <SummaryCell code={s.batch_code} />
                </div>
              ))}
            </div>
          </div>
        )}

        {hasItem && (
          <div className={`cmp-row${itemDiff ? " is-diff" : ""}`} role="row" style={{ "--cols": products.length }}>
            <div className="cmp-cell feat-col" role="cell">
              <span className="cmp-feat-label">Articolo</span>
            </div>
            <div className="cmp-prods">
              {summaries.map((s, i) => (
                <div className="cmp-cell prod-col" role="cell" key={`item-${i}`}>
                  <SummaryCell name={s.item_name} code={s.item_code} description={s.item_description} />
                </div>
              ))}
            </div>
          </div>
        )}

        {hasFamily && (
          <div className={`cmp-row${familyDiff ? " is-diff" : ""}`} role="row" style={{ "--cols": products.length }}>
            <div className="cmp-cell feat-col" role="cell">
              <span className="cmp-feat-label">Famiglia</span>
            </div>
            <div className="cmp-prods">
              {summaries.map((s, i) => (
                <div className="cmp-cell prod-col" role="cell" key={`family-${i}`}>
                  <SummaryCell
                    name={s.productfamily_name}
                    code={s.productfamily_code}
                    description={s.productfamily_description}
                    uom={s.productfamily_uom}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {extraFields.map((f, idx) => {
          const id = f.ID;
          const normVals = products.map((p) => normalize(pickDatum(p, id, language)));
          const isDiff = new Set(normVals).size > 1;
          let label = id;
          for (const p of products) {
            const d = pickDatum(p, id, language);
            if (d?.label) { label = d.label; break; }
          }
          return (
            <div
              className={`cmp-row${isDiff ? " is-diff" : ""}`}
              key={`bif-extra-${sIdx}-${id}-${idx}`}
              role="row"
              style={{ "--cols": products.length }}
            >
              <div className="cmp-cell feat-col" role="cell">
                <span className="cmp-feat-label">{label}</span>
              </div>
              <div className="cmp-prods">
                {products.map((p, pi) => (
                  <div className="cmp-cell prod-col" role="cell" key={`bif-ec-${sIdx}-${id}-${pi}`}>
                    <Cell value={shapeValue(pickDatum(p, id, language))} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    );
  };

  const renderCompanySection = (section, sIdx) => {
    const extraFields = Array.isArray(section.fields) ? section.fields : [];
    return (
      <section className="cmp-section" key={`sec-${sIdx}`}>
        <div className="cmp-sec-title">
          <span className="cmp-sec-title-span">Azienda</span>
        </div>
        <div className="cmp-row cmp-row--company" role="row" style={{ "--cols": products.length }}>
          <div className="cmp-cell feat-col" role="cell" />
          <div className="cmp-prods">
            {summaries.map((s, si) => {
              const name = s.company_legalname || s.company_shortname;
              return (
                <div className="cmp-cell prod-col cmp-company-col" role="cell" key={`co-${si}`}>
                  {name && <span className="cmp-company-name">{name}</span>}
                  {s.company_vat && <span className="cmp-company-field">P.IVA {s.company_vat}</span>}
                  {s.company_address && <span className="cmp-company-field"><MapPin size={11} />{s.company_address}</span>}
                  {s.company_email && <a className="cmp-company-field cmp-company-link" href={`mailto:${s.company_email}`}><Mail size={11} />{s.company_email}</a>}
                  {s.company_phonenumber && <a className="cmp-company-field cmp-company-link" href={`tel:${s.company_phonenumber}`}><Phone size={11} />{s.company_phonenumber}</a>}
                  {s.company_website && (
                    <a className="cmp-company-field cmp-company-link" href={s.company_website.startsWith('http') ? s.company_website : `https://${s.company_website}`} target="_blank" rel="noopener noreferrer">
                      <Globe size={11} />{s.company_website}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {extraFields.map((f, idx) => {
          const id = f.ID;
          const normVals = products.map((p) => normalize(pickDatum(p, id, language)));
          const isDiff = new Set(normVals).size > 1;
          let label = id;
          for (const p of products) {
            const d = pickDatum(p, id, language);
            if (d?.label) { label = d.label; break; }
          }
          return (
            <div
              className={`cmp-row${isDiff ? " is-diff" : ""}`}
              key={`co-extra-${sIdx}-${id}-${idx}`}
              role="row"
              style={{ "--cols": products.length }}
            >
              <div className="cmp-cell feat-col" role="cell">
                <span className="cmp-feat-label">{label}</span>
              </div>
              <div className="cmp-prods">
                {products.map((p, pi) => (
                  <div className="cmp-cell prod-col" role="cell" key={`co-ec-${sIdx}-${id}-${pi}`}>
                    <Cell value={shapeValue(pickDatum(p, id, language))} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    );
  };

  const renderFormSection = (section, sIdx) => {
    const fields = Array.isArray(section.fields) ? section.fields : [];
    return (
      <section className="cmp-section" key={`sec-${sIdx}`}>
        <div className="cmp-sec-title">
          <span className="cmp-sec-title-span">{section.form_name}</span>
        </div>
        {fields.map((f, idx) => {
          const id = f.ID;
          const normVals = products.map((p) => normalize(pickDatum(p, id, language)));
          const isDiff = new Set(normVals).size > 1;
          let label = id;
          for (const p of products) {
            const d = pickDatum(p, id, language);
            if (d?.label) { label = d.label; break; }
          }
          return (
            <div
              className={`cmp-row${isDiff ? " is-diff" : ""}`}
              key={`row-${sIdx}-${id}-${idx}`}
              role="row"
              style={{ "--cols": products.length }}
            >
              <div className="cmp-cell feat-col" role="cell">
                <span className="cmp-feat-label">{label}</span>
              </div>
              <div className="cmp-prods">
                {products.map((p, pi) => (
                  <div className="cmp-cell prod-col" role="cell" key={`c-${sIdx}-${id}-${pi}`}>
                    <Cell value={shapeValue(pickDatum(p, id, language))} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    );
  };

  return (
    <div className="cmp-wrap" style={{ "--cols": products.length }}>
      {/* Pulsanti navigazione mobile */}
      <div className="cmp-nav-mobile">
        <button type="button" className="nav-btn nav-btn--back" onClick={() => setShowCompare(false)}>
          <ArrowLeft size={18} /><span>Indietro</span>
        </button>
        <button type="button" className="nav-btn nav-btn--primary" onClick={onAddProduct}>
          <QrCode size={18} /><span>Aggiungi prodotto al confronto</span>
        </button>
      </div>

      {/* Barra titolo con navigazione (solo desktop) */}
      <div className="cmp-title-bar">
        <button type="button" className="nav-btn nav-btn--back" onClick={() => setShowCompare(false)}>
          <ArrowLeft size={18} /><span className="cmp-nav-btn-text">Indietro</span>
        </button>
        <h1 className="cmp-title">Sostenibilità a confronto</h1>
        <button type="button" className="nav-btn nav-btn--primary" onClick={onAddProduct}>
          <QrCode size={18} /><span className="cmp-nav-btn-text">Aggiungi prodotto al confronto</span>
        </button>
      </div>

      {/* Header sticky desktop */}
      <header className="cmp-header" ref={cmpHeaderRef}>
        <div className="cmp-row cmp-row--head cmp-head-desktop" style={{ "--cols": products.length }}>
          <div className="cmp-cell feat-col cmp-head-col" />
          {titles.map((t, i) => (
            <div className="cmp-cell prod-col cmp-head-col" key={`h-${i}`}>{t}</div>
          ))}
        </div>
      </header>

      <div ref={sentinelRef} className="cmp-rail-sentinel" />

      {/* Mobile pill rail */}
      <div
        ref={railRef}
        className={`cmp-head-rail${railStuck ? " cmp-head-rail--stuck" : ""}`}
        style={railStuck ? { top: `${headerHeight}px` } : undefined}
      >
        <h1 className="cmp-title cmp-title--mobile">Sostenibilità a confronto</h1>
        <div role="tablist" aria-label="Prodotti in confronto">
          {titles.map((t, i) => (
            <div className="cmp-head-pill" role="tab" key={`hp-${i}`} title={t}>{t}</div>
          ))}
        </div>
      </div>

      {/* Tabella di confronto */}
      <div className="cmp-table" role="table" aria-label="Confronto prodotti" style={{ "--cols": products.length }}>

        {/* ── Sezioni: ordine e contenuto definiti dal JSON del primo prodotto ── */}
        {forms.map((section, sIdx) => {
          const name = section.form_name;
          if (name === 'LOGO' || name === '#LOGOCOMPANY') return renderLogoSection(section, sIdx);
          if (name === '#HEADER')                 return renderHeaderSection(section, sIdx);
          if (name === '#BATCH-ITEM-PRODUCTFAMILY') return renderBatchItemFamilySection(section, sIdx);
          if (name === '#COMPANY')                return renderCompanySection(section, sIdx);
          return renderFormSection(section, sIdx);
        })}

        {/* ── Sezione: Tracciabilità (data-driven, non configurabile via form_name) ── */}
        {products.some(p => p.linked_batches?.length > 0) && (
          <section className="cmp-section">
            <div className="cmp-sec-title">
              <span className="cmp-sec-title-span">Tracciabilità</span>
            </div>
            <div className="cmp-row cmp-row--linked" role="row" style={{ "--cols": products.length }}>
              <div className="cmp-cell feat-col" role="cell" />
              <div className="cmp-prods">
                {products.map((p, pi) => (
                  <div className="cmp-cell prod-col cmp-linked-col" role="cell" key={`linked-${pi}`}>
                    {p.linked_batches?.length > 0 ? (
                      <ul className="cmp-linked-simple">
                        {p.linked_batches.map((lb, li) => {
                          const label = lb.item_name || lb.item_code || lb.batch_code;
                          const handleClick = loadNewElement ? () => {
                            const api_url = getApiUrl(lb.company_webservice, lb.batch_code, lb.item_code, lb.productfamily_code, lb.company_code, language);
                            setShowCompare(false);
                            loadNewElement({ api_url, save_parent: true, skip_compare: true });
                          } : null;
                          return (
                            <li key={li} className="cmp-linked-simple__item">
                              {handleClick ? (
                                <button className="cmp-linked-simple__btn" onClick={handleClick}>
                                  {label}
                                </button>
                              ) : (
                                <span>{label}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <span className="cmp-muted">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

CompareForms.propTypes = {
  dataList: PropTypes.array.isRequired,
  language: PropTypes.string.isRequired,
  setShowCompare: PropTypes.func,
  onAddProduct: PropTypes.func,
  loadNewElement: PropTypes.func,
};
