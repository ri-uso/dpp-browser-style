import PropTypes from 'prop-types';
import translations from './Translations.json';
import '../styles/ProductInfo.css';

export default function ProductInfo({ summary, language }) {
  const t = translations[language] ?? translations['IT'];

  const {
    item_name,
    item_code,
    item_description,
    batch_code,
    productfamily_code,
    productfamily_name,
    productfamily_description,
    productfamily_uom,
  } = summary;

  const rows = [
    batch_code            && { label: t.batch_code_text,              value: batch_code },
    item_name             && { label: t.item_name_text,               value: item_name },
    item_code             && { label: t.item_code_text,               value: item_code },
    item_description      && { label: t.item_description_text,        value: item_description },
    productfamily_name    && { label: t.productfamily_name_text,      value: productfamily_name },
    productfamily_code    && { label: t.productfamily_code_text,      value: productfamily_code },
    productfamily_uom     && { label: t.productfamily_uom_text,       value: productfamily_uom },
    productfamily_description && { label: t.productfamily_description_text, value: productfamily_description },
  ].filter(Boolean);

  if (!rows.length) return null;

  return (
    <div className="product-info" data-aos="fade-down">
      <div className="product-info__flat">
        {rows.map(({ label, value }, i) => (
          <div className="product-info__row" key={i}>
            <span className="product-info__row-label">{label}</span>
            <span className="product-info__row-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

ProductInfo.propTypes = {
  language: PropTypes.string.isRequired,
  summary: PropTypes.shape({
    item_name: PropTypes.string,
    item_code: PropTypes.string,
    item_description: PropTypes.string,
    batch_code: PropTypes.string,
    productfamily_code: PropTypes.string,
    productfamily_name: PropTypes.string,
    productfamily_description: PropTypes.string,
    productfamily_uom: PropTypes.string,
  }).isRequired,
};
