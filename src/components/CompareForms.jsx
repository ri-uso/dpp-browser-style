import PropTypes from "prop-types";
import { useEffect } from "react";
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
export default function CompareForms({ dataList, language, setShowCompare = () => {} }) {
  // ✅ Calcolo automatico dell’altezza della hero
  useEffect(() => {
    function updateHeroHeight() {
      const hero = document.querySelector(
        ".hero, .main-hero, header.hero, #hero, .custom-header-image"
      );
      if (hero) {
        const rect = hero.getBoundingClientRect();
        const height = rect.height;
        document.documentElement.style.setProperty("--hero-height", `${height}px`);
      } else {
        document.documentElement.style.setProperty("--hero-height", "240px");
      }
    }

    updateHeroHeight();
    window.addEventListener("resize", updateHeroHeight);
    return () => window.removeEventListener("resize", updateHeroHeight);
  }, []);

  // ✅ Movimento dinamico dell'header su mobile (attacco perfetto in alto)
  useEffect(() => {
    const header = document.querySelector(".cmp-header");
    const wrap = document.querySelector(".cmp-wrap");
    if (!header || !wrap) return;

    const updateHeaderPosition = () => {
      const heroHeight =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue("--hero-height")
        ) || 0;

      // ✅ Calcola l'altezza reale dell'header (dinamica in base al numero di prodotti)
      const headerHeight = header.offsetHeight || 0;

      const scrollY = window.scrollY;
      const offset = Math.max(heroHeight - scrollY, 0);

      // Sposta l'header sotto la hero finché si scorre
      header.style.transform = `translateY(${offset}px)`;

      // ✅ Usa l'altezza reale dell'header per il padding
      const basePadding = heroHeight + headerHeight + 16; // 16px margine di sicurezza
      if (offset <= 0) {
        wrap.style.paddingTop = `${basePadding}px`;
      } else {
        // durante lo scroll riduce gradualmente il padding
        wrap.style.paddingTop = `${basePadding - offset * 0.8}px`;
      }
    };

    const handleScroll = () => {
      if (window.innerWidth <= 640) updateHeaderPosition();
      else {
        header.style.transform = "";
        wrap.style.paddingTop = "";
      }
    };

    updateHeaderPosition();
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

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
      {/* Header sticky su desktop, mobile sotto hero e sempre visibile */}
      <header className="cmp-header">
        <button
          type="button"
          className="cmp-close"
          aria-label="Chiudi confronto"
          onClick={() => setShowCompare(false)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

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

        {/* Mobile header */}
        <div className="cmp-head-rail" role="tablist" aria-label="Prodotti in confronto">
          {titles.map((t, i) => (
            <div className="cmp-head-pill" role="tab" key={`hp-${i}`} title={t}>
              {t}
            </div>
          ))}
        </div>
      </header>

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
};


