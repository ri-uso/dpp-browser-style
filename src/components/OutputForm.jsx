import PropTypes from 'prop-types';
import { ExternalLink } from 'lucide-react';
import { FaFilePdf, FaFileAlt } from 'react-icons/fa';
import translations from "./Translations.json";
import "../styles/outputForm.css";

function getYouTubeId(url) {
  const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? match[1] : null;
}

function renderUrlContent(item) {
  const urlType = item.value_url_type?.toUpperCase();
  const url = item.value_url;

  if (urlType === "IMAGE") {
    return (
      <img src={url} alt={item.label ?? "image"} className="img-fluid" />
    );
  }

  if (urlType === "VIDEO") {
    const ytId = getYouTubeId(url);
    if (ytId) {
      return (
        <div className="video-preview">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title={item.label ?? "video"}
            allowFullScreen
            className="video-iframe"
          />
        </div>
      );
    }
    return (
      <video controls className="video-preview-direct">
        <source src={url} />
      </video>
    );
  }

  if (urlType === "P" || urlType === "PDF") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="file-link file-link--pdf" aria-label="Apri PDF" title="Apri PDF">
        <FaFilePdf className="file-link__icon" />
        <ExternalLink className="file-link__arrow" aria-hidden="true" />
      </a>
    );
  }

  if (urlType === "DOC" || urlType === "DOCUMENT") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="file-link file-link--doc" aria-label="Apri documento" title="Apri documento">
        <FaFileAlt className="file-link__icon" />
        <ExternalLink className="file-link__arrow" aria-hidden="true" />
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="external-link">
      <span>Link</span>
      <ExternalLink size={13} className="link-icon" aria-hidden="true" />
    </a>
  );
}

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

  // classi per il valore
  const valueClassNames = orderedData.map(e => {
    const match = (e?.requested_language || "").toLowerCase() === String(language).toLowerCase();
    const urlType = e?.value_url_type?.toUpperCase();
    const isFileLink = urlType === "P" || urlType === "PDF" || urlType === "DOC" || urlType === "DOCUMENT";
    return `value py-2${match ? "" : " value--fallback"}${isFileLink ? " value--file" : ""}`;
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
            const valueType = item.value_type?.toLowerCase();

            // Determina il contenuto in base al tipo
            let valueContent;
            if (valueType === "url" || item.value_url) {
              valueContent = renderUrlContent(item);
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
                <div className="label">{item.label ?? ""}</div>
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
