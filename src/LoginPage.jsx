import React from "react";
import { loginWithGoogle, loginWithFacebook } from "./components/Firebase";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

import translations from "./components/Translations.json";

export default function LoginPage({ language }) {
  const navigate = useNavigate();

  const handleLogin = async (providerFn) => {
    try {
      const userCredential = await providerFn();

      if (getAuth().currentUser) {
        navigate("/"); // Back to HomePage if login is successfull
      } else {
        console.warn("Login failed or aborted");
      }

    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <main className="d-flex flex-column align-items-center justify-content-center gap-3 mt-2">
      <h2>Login</h2>
      <button className="btn btn-light d-flex align-items-center gap-2 border" onClick={() => handleLogin(loginWithGoogle)}>
        {/* Google Icon */}
        <svg width="20" height="20" viewBox="0 0 533.5 544.3">
          <path fill="#4285f4" d="M533.5 278.4c0-17.6-1.6-34.6-4.6-51H272v96.7h147.4c-6.4 34-25.2 62.8-53.7 82v68h86.7c50.8-46.8 81.1-115.7 81.1-195.7z"/>
          <path fill="#34a853" d="M272 544.3c71.6 0 131.7-23.7 175.6-64.4l-86.7-68c-24.1 16.2-55 25.6-88.9 25.6-68.4 0-126.3-46.2-147-108.3h-89.3v67.9c43.3 85.4 131.8 147.2 236.3 147.2z"/>
          <path fill="#fbbc05" d="M125 329.2c-10.3-30.5-10.3-63.7 0-94.2V167h-89.3c-39.2 76.5-39.2 166.8 0 243.3L125 329.2z"/>
          <path fill="#ea4335" d="M272 107.7c37.5-.6 73.6 13 101.2 38.3l75.2-75.2C409 24.3 342.4-0.3 272 0 167.5 0 79 61.8 35.7 147.2L125 215c20.7-62.1 78.6-108.3 147-107.3z"/>
        </svg>
        <span>
          <span className="d-none d-md-inline">{translations[language].login_with} </span>Google
        </span>
      </button>
      <button className="btn btn-light d-flex align-items-center gap-2 border" onClick={() => handleLogin(loginWithFacebook)}>
        {/* Facebook Icon */}
        <svg width="20" height="20" viewBox="0 0 320 512" fill="#1877F2">
          <path d="M279.1 288l14.2-92.7h-88.9V133.2c0-25.4 12.4-50.1 52.2-50.1h40.4V6.3S266.4 0 225.4 0
          c-73.5 0-121.4 44.4-121.4 124.7v70.6H22.9V288h81.1v224h100.2V288z"/>
        </svg>
        <span>
          <span className="d-none d-md-inline">{translations[language].login_with} </span>Facebook
        </span>
      </button>
    </main>
  );
}
