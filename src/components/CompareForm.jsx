
import PropTypes from 'prop-types';
import translations from "./Translations.json";
import "../styles/CompareForm.css";

const renderValue = (value, language) => {
  if (!value || typeof value !== 'object') return null;

  const url = value.value_url;
  const urlType = value.value_url_type?.toUpperCase(); 
  const text = value.value_text || translations[language]?.link_text || "Apri";

  if (!url) {
    return (
      <div>
        {value.value_text || ""}
        {value.value_number ? ` ${value.value_number}` : ""}
        {value.value_number_unit_of_measure || ""}
      </div>
    );
  }

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    let videoId = null;
    if (url.includes("youtube.com")) {
      const params = new URLSearchParams(new URL(url).search);
      videoId = params.get("v");
    } else {
      videoId = url.split("/").pop();
    }

    if (videoId) {
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="preview-wrapper">
          <img
            src={thumbnailUrl}
            alt="Anteprima YouTube"
            className="preview-frame"
          />
        </a>
      );
    }
  }

  if (urlType === 'IMAGE') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="preview-wrapper">
        <iframe
          className="preview-frame"
          src={url.replace("/view", "/preview")}
          title="Image Preview"
          allowFullScreen
        />
      </a>
    );
  }

  if (urlType === 'VIDEO') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="preview-wrapper">
        <iframe
          className="preview-frame"
          src={url.replace("/view", "/preview")}
          title="Video Preview"
          allow="autoplay"
          allowFullScreen
        />
      </a>
    );
  }

  if (urlType === 'PDF') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="preview-wrapper">
        <iframe
          className="preview-frame"
          src={url.replace("/view", "/preview")}
          title="PDF Preview"
        />
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {text}
    </a>
  );
};



function CompareForm({ formName, dataList, language }) {
  const mergedFields = new Map();

  dataList.forEach((data, idx) => {
    const form = data.forms.find(f => f.form_name === formName);
    const orderedData = form ? form.fields.map(field =>
      data.data.find(d => d.ID === field.ID)
    ).filter(Boolean) : [];

    orderedData.forEach(item => {
      if (!mergedFields.has(item.label)) {
        mergedFields.set(item.label, Array(dataList.length).fill(null));
      }
      mergedFields.get(item.label)[idx] = item;
    });
  });

  const rows = Array.from(mergedFields.entries());

  return (
    <section className="compare-form mb-5 p-4 rounded border bg-white shadow-sm">
      <div className="col-12">
        <h2 className="section-title mb-4 text-center fs-5 border-bottom pb-2">
          {formName}
        </h2>

        {rows.map(([label, values], index) => {
         const getAlignmentClass = (total, idx) => {
  if (total === 1) return 'text-center';
  if (total === 2) return idx === 0 ? 'text-start' : 'text-end';
  if (total === 3) return ['text-start', 'text-center', 'text-end'][idx];
  if (total === 4) return ['text-start', 'text-left-center', 'text-right-center', 'text-end'][idx];

  const middle = (total - 1) / 2;
  const pos = idx - middle;

  if (Math.abs(pos) < 0.5) return 'text-center';
  if (pos < 0) return 'text-start';
  return 'text-end';
};
const getValueColorClass = (total, idx) => {
  if (total === 1) return 'bg-color-center';
  if (total === 2) return idx === 0 ? 'bg-color-left' : 'bg-color-right';
  if (total === 3) return ['bg-color-left', 'bg-color-center', 'bg-color-right'][idx];
  if (total === 4) return ['bg-color-left', 'bg-color-center', 'bg-color-center', 'bg-color-right'][idx];
  return 'bg-color-extra';
};


          return (
            <div
              className={`compare-row-vertical ${index === rows.length - 1 ? 'last-row' : ''}`}
              key={index}
            >
              <div className="label fw-semibold py-2 ps-2 mb-2">
                {label}
              </div>
            <div className="product-values-list" style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
  {values.map((val, idx) => (
    <div key={idx} className={`product-value rounded ${getValueColorClass(values.length, idx)}`}>

      <span className={`product-content ms-2 ${getAlignmentClass(values.length, idx)}`}>
        {renderValue(val, language)}
      </span>
    </div>
  ))}
</div>

            </div>
          );
        })}
      </div>
    </section>
  );
}

CompareForm.propTypes = {
  formName: PropTypes.string.isRequired,
  dataList: PropTypes.arrayOf(
    PropTypes.shape({
      forms: PropTypes.array.isRequired,
      data: PropTypes.array.isRequired
    })
  ).isRequired,
  language: PropTypes.string.isRequired,
};

export default CompareForm;

