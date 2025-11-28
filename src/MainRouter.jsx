// MainRouter.jsx
import { BrowserRouter as Router, Routes, Route, useSearchParams } from "react-router-dom";
import { useState, useEffect } from 'react';
import App from "./App";
import LoginPage from './LoginPage';
import Footer from "./components/Footer.jsx"
import Header from "./components/Header";
import 'bootstrap/dist/css/bootstrap.min.css';

const MainRouterContent = () => {
  const [language, setLanguage] = useState('IT');
  const [companyCode, setCompanyCode] = useState('dpp'); // default logo dpp
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const companyCodeParam = searchParams.get('company_code');
    if (companyCodeParam) {
      setCompanyCode(companyCodeParam.toLowerCase());
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
