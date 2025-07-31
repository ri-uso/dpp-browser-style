import { useState, useEffect } from 'react';
import Scanner from './Scanner';
import translations from "./Translations.json";
import PropTypes from 'prop-types';
import {getApiUrl} from '../utilities.jsx'
import '../styles/InputForm.css';

function InputForm({ loadNewElement, language }) {
  /*
    batch_code: 'MG01S-A',
    item_code: 'MG01S',
    productfamily_code: 'MG',
    company_code: 'GreenFashionLab',
    url: 'https://80.211.143.55',
  ;*/
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
      <button className="mt-2 mb-2 btn-qr" onClick={handleShowButtonClick}>
        <img src="/images/qr-code.png" className="qr" alt="QR code" />
      </button>
      <p className='qr-code'>
        {btnLabel}
        <span className='qr-subtitle'>
          Vuoi saperne di più? Scansiona il QR code e scopri tutto sul tuo prodotto!
        </span>
      </p>
    </div>
  </div>

  <div className="form-column">
    <form>
      <div className="form-group">
        <label>{translations[language].batch_code_text}</label>
        <input type="text" className="form-control" name="batch_code" autoComplete="on" onChange={handleFormChange} />
      </div>
      <div className="form-group">
        <label>{translations[language].item_code_text}</label>
        <input type="text" className="form-control" name="item_code" autoComplete="on" onChange={handleFormChange} />
      </div>
      <div className="form-group">
        <label>{translations[language].productfamily_code_text}</label>
        <input type="text" className="form-control" name="productfamily_code" autoComplete="on" onChange={handleFormChange} />
      </div>
      <div className="form-group">
        <label>{translations[language].company_code_text}</label>
        <input type="text" className="form-control" name="company_code" autoComplete="on" onChange={handleFormChange} />
      </div>
      <div className="form-group">
        <label>URL</label>
        <input type="text" className="form-control" name="url" autoComplete="on" onChange={handleFormChange} />
      </div>
    </form>

    <button className="mt-2 btn-primary" onClick={handleEnterButtonClick}>
      {translations[language].send_text}
    </button>
  </div>
</div>

        : <Scanner  handleShowButtonClick={handleShowButtonClick} btnLabel={btnLabel} loadNewElement={loadNewElement}/>
      }
    </section>
  )
}
InputForm.propTypes = {
  loadNewElement: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired,
};

export default InputForm;
