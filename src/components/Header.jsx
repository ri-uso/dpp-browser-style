import { useState, useEffect } from 'react';
import Select from 'react-flags-select';
import { onAuthStateChanged } from "firebase/auth";
import { handleLogout } from "./AuthService.jsx";
import { auth } from "./Firebase";
import { FaUser } from 'react-icons/fa';
import translations from "./Translations.json";
import PropTypes from 'prop-types';
import { Link } from "react-router-dom";
import { getLogos } from "../config/logos.js";

const languages = {
  IT: "IT",
  GB: "EN",
  ES: "ES",
  FR: "FR",
  RO: "RO",
};

// Lingua dell'interfaccia richiesta dal QR (?lang=it|en|fr|ro). Il codice e'
// quello usato dal selettore (react-flags-select): GB per l'inglese.
const qrLangToCountry = { it: "IT", en: "GB", es: "ES", fr: "FR", ro: "RO" };

function countryFromUrl() {
  const lang = new URLSearchParams(window.location.search).get('lang');
  return qrLangToCountry[String(lang || '').toLowerCase()] || 'IT';
}

function Header({ setLanguage, language, companyCode }) {
  const [selectedCountry, setCountry] = useState(countryFromUrl);
  const [user, setUser] = useState(null);
  const logos = getLogos(companyCode);

  useEffect(() => {
    setLanguage(languages[selectedCountry]);
  }, [selectedCountry, setLanguage]);

  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const customLabelsFull = { IT: "Italiano", GB: "English", ES: "Español", FR: "Français", RO: "Română" };
  const customLabelsShort = { IT: "IT", GB: "EN", ES: "ES", FR: "FR", RO: "RO" };

  return (
    <header className="main-header">

      {logos?.header && (
        <div className="custom-header-image">
          <Link to="/">
            <img
              src={logos.header}
              alt="Header DPP"
              className="header-custom-img"
              style={{ cursor: "pointer" }}
            />
          </Link>
        </div>
      )}
   
      
        <div className='lingue-login'>
          <div className='lingue-select'> 
            <Select
              countries={["IT", "GB", "ES", "FR", "RO"]}
              customLabels={screenWidth > 420 ? customLabelsFull : customLabelsShort}
              onSelect={setCountry}
              selected={selectedCountry}
              showSelectedLabel={false}
              showOptionLabel={false}
            />
          </div>
          <div className="login">
            {user ? (
              <div className="d-flex align-items-center">
                <div>
                  <p className="ms-2 mb-0">
                    {screenWidth > 420 ? user.email : user.displayName}
                  </p>
                  <span className="ms-2 logout-link" onClick={handleLogout}>
                    Logout
                  </span>
                </div>
                <img src={user.photoURL} alt="Profile" className="ms-2 rounded-circle img-fluid" style={{ height: '35px', width: '35px' }} />
              </div>
            ) : (
              <Link to="/login" className="login-icon">
                <FaUser style={{ marginRight: '8px' }} />
              </Link>
            )}
          </div>
        </div>
      
    </header>
  );
}

Header.propTypes = {
  setLanguage: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired,
  companyCode: PropTypes.string.isRequired
};

export default Header;
