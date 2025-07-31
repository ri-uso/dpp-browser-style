import { useState, useEffect } from 'react';
import Select from 'react-flags-select';
import { useGoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import translations from "./Translations.json";
import PropTypes from 'prop-types';
import { isTokenValid, getCookie } from '../utilities.jsx';
import { jwtDecode } from "jwt-decode";
import "../styles/Header.css";

const languages = {
  IT: "IT",
  GB: "EN",
  ES: "ES",
  FR: "FR",
};

function Header({ setLanguage, language }) {
  const [selectedCountry, setCountry] = useState('IT');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  const onLoginSuccess = (response) => {
    setIsLoggedIn(true);
    const userObject = jwtDecode(response.credential);
    setUserProfile(userObject);
    document.cookie = `jwtToken=${response.credential}; max-age=172800; secure; SameSite=Strict`;
    console.log(response.credential);
  };
  
  const onLoginError = (response) => {
    console.log(response);
  };

  const login = useGoogleLogin({
    onSuccess: onLoginSuccess,
    onError: onLoginError,
  });

  useEffect(() => {
    setLanguage(languages[selectedCountry]);
  }, [selectedCountry, setLanguage]);

  useEffect(() => {
    const token = getCookie("jwtToken");
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        if (isTokenValid(decodedToken)) {
          setIsLoggedIn(true);
          setUserProfile(decodedToken);
        }
      } catch (error) {
        console.log(error);
        setIsLoggedIn(false);
      }
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserProfile(null);
    document.cookie = `jwtToken=${null};`;
  };

  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const emailParts = userProfile && userProfile.email ? userProfile.email.split('@') : [];
  const username = emailParts[0] || '';
  
  const customLabelsFull = { IT: "Italiano", GB: "English", ES: "Español", FR: "Français" };
  const customLabelsShort = { IT: "IT", GB: "EN", ES: "ES", FR: "FR" };
  const clientId = "28880670233-rfbhtbqpefv7mqpdikeevvmgg3mrg7gv.apps.googleusercontent.com";

  useEffect(() => {
    const btn = document.querySelector('.ReactFlagsSelect-module_selectBtn__19wW7');
    if (btn) {
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.addEventListener('mouseenter', () => {
        btn.style.color = 'black';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.color = 'white';
      });
    }
  }, []);

  return (
    <section>
 
      <div className="custom-header-image">
        <img src="./images/HeaderDPP.png" alt="Header DPP" className="header-custom-img" />
      </div>
   
      <div className="header d-flex justify-content-between align-items-stretch">
        <div className='lingue-login'>
          <div className='Lingue'> 
            <Select
              countries={["IT", "GB", "ES", "FR"]}
              customLabels={screenWidth > 420 ? customLabelsFull : customLabelsShort}
              onSelect={setCountry}
              selected={selectedCountry}
              className='custom-select lingue-login-btn'
            />
          </div>
          <div className="login">
            <GoogleOAuthProvider clientId={clientId}>
              {isLoggedIn ? (
                <div className="d-flex align-items-center">
                  <div>
                    <p className="ms-2 mb-0">
                      {screenWidth > 420 ? userProfile.email : username}
                    </p>
                    <span className="ms-2 cursor-pointer logout-link" onClick={handleLogout}>
                      Logout
                    </span>
                  </div>
                  <img src={userProfile.picture} alt="Profile" className="ms-2 rounded-circle img-fluid" style={{ height: '35px', width: '35px' }} />
                </div>
              ) : (
                <button onClick={() => login()} className="my-google-button lingue-login-btn">
                  {translations[language].btn_login}
                </button>
              )}
            </GoogleOAuthProvider>
          </div>
        </div>
      </div>
    </section>
  );
}

Header.propTypes = {
  setLanguage: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired
};

export default Header;
