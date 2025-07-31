
import translations from "./Translations.json";
import PropTypes from 'prop-types';
import Modal from 'react-bootstrap/Modal';
import { useState, useEffect } from "react";
import { compareDppDatas } from "../utilities";
function SelectListPopup({ show, history, setHistory, curr_element, ask_to_compare, handleAskToCompareCheckbox, handleClose, handleConfirmCompare, language }) {
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState([]);

  const [isButtonDisabled, setButtonDisabled] = useState(true);

useEffect(() => { 
  setButtonDisabled(selectedIndices.length === 0);
}, [selectedIndices]);

const handleSelectedItem = (index) => {
  setSelectedIndices(prev => 
    prev.includes(index) 
      ? prev.filter(i => i !== index) 
      : [...prev, index]
  );
};


const filteredHistory = history.filter(
    (item) => compareDppDatas(item, curr_element)
  );


const handleCompare = () => {
   handleConfirmCompare(selectedIndices.map(i => filteredHistory[i]));

  };


  const handleDeleteItem = (index) => {
    setHistory(currentHistory => currentHistory.filter(item => !compareDppDatas(item, filteredHistory[index])));
    if(selectedItemIndex === index) {
      setSelectedItemIndex(null);
    }
  };


  const ResetHistory = () => {
     setHistory(currentHistory =>
    currentHistory.filter(item =>
      !filteredHistory.some(filteredItem => compareDppDatas(item, filteredItem))
    )
  );
    setSelectedItemIndex(null);
    handleClose();
  };


  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{translations[language].select_item_text}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ul className="list-group">
          {filteredHistory.map((item, index) => (
            <li
              key={index}
              className={`list-group-item ${selectedIndices.includes(index) ? "active" : ""}`}
              style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
          <span
              onClick={() => handleSelectedItem(index)}
              role="button"
              tabIndex="0"
              onKeyDown={(e) => e.key === 'Enter' && handleSelectedItem(index)}
              style={{ flexGrow: 1, marginRight: '10px' }}
              >           
              {item.summary.item_name
                ? item.summary.item_name
                : item.summary.item_code}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteItem(index);
                }}
                style={{
                  color: "red",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "bold",
                  lineHeight: 1,
                  fontSize: "1.5em",
                }}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>

        <button className="btn btn-secondary mt-2" onClick={ResetHistory}>
          Reset
        </button>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between">
        <div className="form-check mt-2">
          <input
            className="form-check-input"
            type="checkbox"
            id="compare-checkbox"
            checked={ask_to_compare}
            onChange={handleAskToCompareCheckbox}
          />
          <label className="form-check-label" htmlFor="compare-checkbox" >
            {translations[language].ask_to_compare_text}
          </label>
        </div>
        <button className="btn btn-primary" disabled={isButtonDisabled} onClick={handleCompare}>
          {translations[language].compare_text}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
SelectListPopup.propTypes = {
  show: PropTypes.bool.isRequired,
  history: PropTypes.array.isRequired,
  setHistory: PropTypes.func.isRequired,
  curr_element: PropTypes.object.isRequired,
  ask_to_compare: PropTypes.bool.isRequired,
  handleAskToCompareCheckbox: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired,
  handleConfirmCompare: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired,
};

export default SelectListPopup;

