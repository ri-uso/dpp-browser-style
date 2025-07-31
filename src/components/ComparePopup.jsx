import translations from "./Translations.json";
import PropTypes from 'prop-types';
import Modal from 'react-bootstrap/Modal';
function ComparePopup({ show, handleClose, handleConfirm, language, productCount }) {
  const popupText = translations[language].compare_popup_body_text.replace('{count}', productCount);

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{translations[language].compare_text}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{popupText}</Modal.Body>
      <Modal.Footer className="d-flex justify-content-between">
        <button className="btn btn-secondary" onClick={handleClose}>
          {translations[language].no_text}
        </button>
        <button className="btn btn-primary" onClick={handleConfirm}>
          {translations[language].yes_text}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

ComparePopup.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  handleConfirm: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired,
    productCount: PropTypes.number.isRequired,
};

export default ComparePopup;
