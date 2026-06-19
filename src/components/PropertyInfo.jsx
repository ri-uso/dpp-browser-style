import PropTypes from 'prop-types';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import { Info } from 'lucide-react';
import "../styles/propertyInfo.css";

/**
 * Icona ⓘ accanto al nome di una proprietà: al click/tap apre un popover
 * con la description. Non renderizza nulla se la description è vuota.
 * Usata sia in OutputForm (prodotto singolo) sia in CompareForms (confronto).
 */
function PropertyInfo({ description, label = "", size = 14 }) {
  if (!description || !String(description).trim()) return null;

  return (
    <OverlayTrigger
      trigger="click"
      placement="top"
      rootClose
      overlay={
        <Popover className="prop-desc-popover">
          <Popover.Body>{description}</Popover.Body>
        </Popover>
      }
    >
      <button
        type="button"
        className="label__info"
        aria-label={`Descrizione: ${label}`}
      >
        <Info size={size} aria-hidden="true" />
      </button>
    </OverlayTrigger>
  );
}

PropertyInfo.propTypes = {
  description: PropTypes.string,
  label: PropTypes.string,
  size: PropTypes.number,
};

export default PropertyInfo;
