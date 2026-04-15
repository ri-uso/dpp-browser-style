// MainRouter.jsx
import { BrowserRouter as Router, Routes, Route, useSearchParams } from "react-router-dom";
import { useState, useEffect } from 'react';
import App from "./App";
import LoginPage from './LoginPage';
import Footer from "./components/Footer.jsx"
import Header from "./components/Header";
import { applyCompanyColors, hasAccessibilityWidget } from './config/logos.js';
import 'bootstrap/dist/css/bootstrap.min.css';

const MainRouterContent = () => {
  const [language, setLanguage] = useState('IT');
  const [companyCode, setCompanyCode] = useState('dpp'); // default logo dpp
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const companyCodeParam = searchParams.get('company_code');
    const code = companyCodeParam ? companyCodeParam.toLowerCase() : 'dpp';
    setCompanyCode(code);
    applyCompanyColors(code);

    const SCRIPT_ID = 'sienna-accessibility-widget';
    const existing = document.getElementById(SCRIPT_ID);

    if (hasAccessibilityWidget(code)) {
      if (!existing) {
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = 'https://cdn.jsdelivr.net/npm/sienna-accessibility@latest/dist/sienna-accessibility.umd.js';
        script.setAttribute('data-asw-position', 'bottom-right');
        script.defer = true;
        document.body.appendChild(script);
      }
    } else {
      existing?.remove();
    }
  }, [searchParams]);

  return (
    <>
      <Header setLanguage={setLanguage} language={language} companyCode={companyCode} />
      <Routes>
        <Route path="/" element={<App language={language} />} />
        <Route path="/login" element={<LoginPage language={language} />} />
      </Routes>
      <Footer companyCode={companyCode} />
    </>
  );
};

const MainRouter = () => {
  return (
    <Router>
      <MainRouterContent />
    </Router>
  );
};

export default MainRouter;
