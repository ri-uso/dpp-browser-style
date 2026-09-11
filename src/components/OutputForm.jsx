import PropTypes from 'prop-types';
import PropertyInfo from './PropertyInfo.jsx';
import { UrlValue } from './urlValue.jsx';
import translations from "./Translations.json";
import { pickItem } from '../utilities.jsx';
import "../styles/outputForm.css";

function isItemEmpty(item) {
  const valueType = item.value_type?.toLowerCase();
  if (valueType === "url" || item.value_url) {
    return !item.value_url;
  }
  if (valueType === "value") {
    // 0 è un valore valido (es. 0%): nascondi solo se manca il numero
    return item.value_number == null || item.value_number === "";
  }
  return item.value_text == null || String(item.value_text).trim() === "";
}

function OutputForm({ form, data_list = [], language = "IT" }) {
  // fields sicuri
  const fields = Array.isArray(form?.fields) ? form.fields : [];

  // normalizza la lingua alla chiave esistente in Translations.json (case-insensitive)
  const langKey =
    Object.keys(translations).find(k => k.toLowerCase() === String(language).toLowerCase())
    ?? Object.keys(translations)[0]; // fallback alla prima lingua disponibile

  // ordina i dati secondo fields.ID e filtra i buchi, scegliendo la riga della lingua attiva
  const orderedData = fields
    .map(f => pickItem(data_list, f.ID, language))
    .filter(Boolean)
    .filter(item => !isItemEmpty(item));

  // classi per il valore
  const valueClassNames = orderedData.map(e => {
    const isExactLangMatch = String(e?.property_language || "").toLowerCase() === String(language).toLowerCase();
    const urlType = e?.value_url_type?.toUpperCase();
    const isFileLink = urlType === "P" || urlType === "PDF" || urlType === "DOC" || urlType === "DOCUMENT";
    return `value py-2${isExactLangMatch ? "" : " value--fallback"}${isFileLink ? " value--file" : ""}`;
  });

  const formNameClass = "mb-3 mt-4 text-start";

  // Nessun campo valorizzato: non mostrare la sezione (evita il titolo a vuoto)
  if (orderedData.length === 0) return null;

  return (
    <section className="output-form">
      <div className="output-row">
        {form?.form_name ? (
          <div className="output-title">
            <h2 className={formNameClass}>{form.form_name}</h2>
          </div>
        ) : null}

        <div className="output-content">
          {orderedData.map((item, index) => {
            const valueType = item.value_type?.toLowerCase();

            // Determina il contenuto in base al tipo
            let valueContent;
            if (valueType === "url" || item.value_url) {
              valueContent = <UrlValue item={item} />;
            } else if (valueType === "value") {
              // Tipo Value: solo numero + unità di misura
              valueContent = (
                <span>
                  {item.value_number ?? ""}{item.value_number_unit_of_measure ? ` ${item.value_number_unit_of_measure}` : ""}
                </span>
              );
            } else {
              // Tipo String (default): solo testo
              valueContent = <span>{item.value_text ?? ""}</span>;
            }

            return (
              <div className="output-item" key={item.ID ?? index}>
                <div className="label">
                  <span className="label__text">{item.label ?? ""}</span>
                  <PropertyInfo description={item.description} label={item.label ?? ""} />
                </div>
                <div className={valueClassNames[index]}>
                  {valueContent}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

OutputForm.propTypes = {
  form: PropTypes.shape({
    form_name: PropTypes.string,
    fields: PropTypes.arrayOf(PropTypes.shape({ ID: PropTypes.any })).isRequired,
  }).isRequired,
  language: PropTypes.string,
  data_list: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default OutputForm;
