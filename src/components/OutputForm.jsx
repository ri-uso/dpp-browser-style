import PropTypes from 'prop-types';
import translations from "./Translations.json";
import "../styles/outputForm.css";

function OutputForm({ form, data_list = [], language = "IT" }) {
  // fields sicuri
  const fields = Array.isArray(form?.fields) ? form.fields : [];

  // normalizza la lingua alla chiave esistente in Translations.json (case-insensitive)
  const langKey =
    Object.keys(translations).find(k => k.toLowerCase() === String(language).toLowerCase())
    ?? Object.keys(translations)[0]; // fallback alla prima lingua disponibile

  // ordina i dati secondo fields.ID e filtra i buchi
  const orderedData = fields
    .map(f => (Array.isArray(data_list)
      ? data_list.find(it => String(it.ID) === String(f.ID)) // <-- se nei dati è "id", cambia qui
      : undefined))
    .filter(Boolean);

  // classi per il valore (se la lingua non coincide, aggiungo una classe di fallback)
  const valueClassNames = orderedData.map(e => {
    const match = (e?.requested_language || "").toLowerCase() === String(language).toLowerCase();
    return `value py-2${match ? "" : " value--fallback"}`;
  });

  const formNameClass = "mb-3 mt-4 text-start";

  return (
    <section className="output-form">
      <div className="output-row">
        <div className="output-title">
          <h2 className={formNameClass}>{form?.form_name ?? ""}</h2>
        </div>

        <div className="output-content">
          {orderedData.map((item, index) => {
            const linkText = item.value_text || translations[langKey]?.link_text || "Open link";
            return (
              <div className="output-item" key={item.ID ?? index}>
                <div className="label">{item.label ?? ""}</div>
                <div className={valueClassNames[index]}>
                  {item.value_url ? (
                    item.value_url_type === "image" ? (
                      <img
                        src={item.value_url}
                        alt={item.label ?? "image"}
                        className="img-fluid"
                      />
                    ) : (
                      <a href={item.value_url} target="_blank" rel="noopener noreferrer">
                        {linkText}
                      </a>
                    )
                  ) : (
                    <span>
                      {item.value_text ?? ""}
                      {item.value_number != null ? ` ${item.value_number}` : ""}
                      {item.value_number_unit_of_measure ? ` ${item.value_number_unit_of_measure}` : ""}
                    </span>
                  )}
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
