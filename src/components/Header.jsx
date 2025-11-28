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
};

function Header({ setLanguage, language, company }) {
  const [selectedCountry, setCountry] = useState('IT');
  const [user, setUser] = useState(null);
  const logos = getLogos(company);

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

  const customLabelsFull = { IT: "Italiano", GB: "English", ES: "Español", FR: "Français" };
  const customLabelsShort = { IT: "IT", GB: "EN", ES: "ES", FR: "FR" };

  return (
    <header>
 
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
   
      
        <div className='lingue-login'>
          <div className='lingue-select'> 
            <Select
              countries={["IT", "GB", "ES", "FR"]}
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
  company: PropTypes.string.isRequired
};

export default Header;
