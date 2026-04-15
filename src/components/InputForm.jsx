import { useState, useEffect } from 'react';
import Scanner from './Scanner';
import translations from "./Translations.json";
import PropTypes from 'prop-types';
import { ArrowLeft } from "lucide-react";
import {getApiUrl} from '../utilities.jsx'

function InputForm({ loadNewElement, language, openScanner = false, setOpenScanner = () => {} }) {
  /*
    batch_code: 'MG01S-A',
    item_code: 'MG01S',
    productfamily_code: 'MG',
    company_code: 'GreenFashionLab',
    url: 'https://80.211.143.55',
  ;*/
  /*
    batch_code: 'C685',
    item_code: 'MED000X-60620-XL',
    productfamily_code: 'MED000X-60620',
    company_code: 'StaffJersey',
    url: 'https://80.211.143.55',
  */
  const[formData, setFormData] = useState({
     batch_code: '',
     item_code: '',
     productfamily_code:'',
     company_code:'',
     url: '',
  });
  const [formVisible, setFormVisible] = useState(true);
  const [btnLabel, setBtnLabel] = useState(translations[language].qr_reader_text);

  useEffect(() => {
    if (formVisible) {
      setBtnLabel(translations[language].qr_reader_text);
    }
    else {
      setBtnLabel(translations[language].manual_input_text);
    }
  }, [language, formVisible]);

  // Apri automaticamente lo scanner quando openScanner è true
  useEffect(() => {
    if (openScanner) {
      setFormVisible(false);
      setOpenScanner(false);
    }
  }, [openScanner, setOpenScanner]);

  const handleShowButtonClick = () => {
    setFormVisible(!formVisible);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData({ ...formData, [name]: value });
  };

  const handleEnterButtonClick = () => {
    let api_url = getApiUrl(formData.url,
      formData.batch_code,
      formData.item_code,
      formData.productfamily_code,
      formData.company_code,
      language);
    
    loadNewElement({api_url:api_url});
  };

  return (
    <section>
     
      {formVisible
        ? <div className="input-form-section">
  <div className="qr-column">
    <div className="qr-button-wrapper">
      <button className="mt-2 mb-2 btn-qr-unified" onClick={handleShowButtonClick}>
        <img src="/images/qr-code.png" className="qr" alt="" />
        <span className="btn-qr-text">QR Code Scanner</span>
        <span className="visually-hidden">
          Scan the QR code with your camera to learn more about your product
        </span>
      </button>
    </div>
  </div>

  <div className="form-column">
    <form>
      <div className="form-group">
        <label htmlFor="batch_code">{translations[language].batch_code_text}</label>
        <input id="batch_code" type="text" className="form-control" name="batch_code" autoComplete="on" onChange={handleFormChange} />
      </div>
      <div className="form-group">
        <label htmlFor="item_code">{translations[language].item_code_text}</label>
        <input id="item_code" type="text" className="form-control" name="item_code" autoComplete="on" onChange={handleFormChange} />
      </div>
      <div className="form-group">
        <label htmlFor="productfamily_code">{translations[language].productfamily_code_text}</label>
        <input id="productfamily_code" type="text" className="form-control" name="productfamily_code" autoComplete="on" onChange={handleFormChange} />
      </div>
      <div className="form-group">
        <label htmlFor="company_code">{translations[language].company_code_text}</label>
        <input id="company_code" type="text" className="form-control" name="company_code" autoComplete="on" onChange={handleFormChange} />
      </div>
      <div className="form-group">
        <label htmlFor="url">URL</label>
        <input id="url" type="text" className="form-control" name="url" autoComplete="on" onChange={handleFormChange} />
      </div>
    </form>

    <button className="mt-2 btn-primary" onClick={handleEnterButtonClick}>
      {translations[language].send_text}
    </button>
  </div>
</div>

        : (
          <div className="scanner-view">
            <div className="scanner-nav-bar">
              <button
                className="nav-btn nav-btn--back"
                onClick={handleShowButtonClick}
              >
                <ArrowLeft size={18} />
                <span>Indietro</span>
              </button>
            </div>
            <Scanner handleShowButtonClick={handleShowButtonClick} btnLabel={btnLabel} loadNewElement={loadNewElement}/>
          </div>
        )
      }
    </section>
  )
}
InputForm.propTypes = {
  loadNewElement: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired,
  openScanner: PropTypes.bool,
  setOpenScanner: PropTypes.func,
};

export default InputForm;
