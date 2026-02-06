import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, QrCode } from "lucide-react";
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

/* --------- main (multi-prodotto) --------- */
export default function CompareForms({ dataList, language, setShowCompare = () => {}, onAddProduct = () => {} }) {

  const railRef = useRef(null);
  const sentinelRef = useRef(null);
  const [railStuck, setRailStuck] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Calcola l'altezza dell'header principale (.main-header) per posizionare il rail sotto
  useEffect(() => {
    function measure() {
      const mainHeader = document.querySelector(".main-header");
      setHeaderHeight(mainHeader ? mainHeader.getBoundingClientRect().height : 0);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Mobile sticky rail: usa IntersectionObserver su un sentinel element
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // rootMargin negativo in alto = il sentinel risulta "uscito" quando finisce sotto l'header
    const observer = new IntersectionObserver(
      ([entry]) => {
        setRailStuck(!entry.isIntersecting);
      },
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

  return (
    <div className="cmp-wrap" style={{ "--cols": products.length }}>
      {/* Barra titolo con navigazione */}
      <div className="cmp-title-bar">
        <button
          type="button"
          className="nav-btn nav-btn--back"
          onClick={() => setShowCompare(false)}
          aria-label="Torna alla home"
        >
          <ArrowLeft size={18} />
          <span className="cmp-nav-btn-text">Indietro</span>
        </button>

        <h1 className="cmp-title">
          Sostenibilità a confronto
        </h1>

        <button
          type="button"
          className="nav-btn nav-btn--primary"
          onClick={onAddProduct}
          aria-label="Aggiungi prodotto al confronto"
        >
          <QrCode size={18} />
          <span className="cmp-nav-btn-text">Aggiungi prodotto al confronto</span>
        </button>
      </div>

      {/* Pulsanti navigazione mobile (sotto il titolo) */}
      <div className="cmp-nav-mobile">
        <button
          type="button"
          className="nav-btn nav-btn--back"
          onClick={() => setShowCompare(false)}
          aria-label="Torna alla home"
        >
          <ArrowLeft size={18} />
          <span>Indietro</span>
        </button>

        <button
          type="button"
          className="nav-btn nav-btn--primary"
          onClick={onAddProduct}
          aria-label="Aggiungi prodotto al confronto"
        >
          <QrCode size={18} />
          <span>Aggiungi prodotto al confronto</span>
        </button>
      </div>

      {/* Header sticky su desktop */}
      <header className="cmp-header">
        {/* Desktop header */}
        <div
          className="cmp-row cmp-row--head cmp-head-desktop"
          style={{ "--cols": products.length }}
        >
          <div className="cmp-cell feat-col cmp-head-col" />
          {titles.map((t, i) => (
            <div className="cmp-cell prod-col cmp-head-col" key={`h-${i}`}>
              {t}
            </div>
          ))}
        </div>

      </header>

      {/* Sentinel: quando esce dal viewport, il rail diventa fixed */}
      <div ref={sentinelRef} className="cmp-rail-sentinel" />

      {/* Mobile header — fixed sotto l'header principale quando si scrolla oltre il sentinel */}
      <div
        ref={railRef}
        className={`cmp-head-rail${railStuck ? " cmp-head-rail--stuck" : ""}`}
        style={railStuck ? { top: `${headerHeight}px` } : undefined}
        role="tablist"
        aria-label="Prodotti in confronto"
      >
        {titles.map((t, i) => (
          <div className="cmp-head-pill" role="tab" key={`hp-${i}`} title={t}>
            {t}
          </div>
        ))}
      </div>

      {/* Tabella di confronto */}
      <div
        className="cmp-table"
        role="table"
        aria-label="Confronto prodotti"
        style={{ "--cols": products.length }}
      >
        {forms.map((section, sIdx) => {
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
                  if (d?.label) {
                    label = d.label;
                    break;
                  }
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
                      {products.map((p, pi) => {
                        const v = shapeValue(pickDatum(p, id, language));
                        return (
                          <div
                            className="cmp-cell prod-col"
                            role="cell"
                            key={`c-${sIdx}-${id}-${pi}`}
                          >
                            <Cell value={v} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

CompareForms.propTypes = {
  dataList: PropTypes.array.isRequired,
  language: PropTypes.string.isRequired,
  setShowCompare: PropTypes.func,
  onAddProduct: PropTypes.func,
};


