// MainRouter.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from 'react';
import App from "./App";
import LoginPage from './LoginPage';
import Footer from "./components/Footer.jsx"
import Header from "./components/Header";
import 'bootstrap/dist/css/bootstrap.min.css';

const MainRouter = () => {

  const [language, setLanguage] = useState('IT');

  return (
    <Router>
      <Header setLanguage={setLanguage} language={language} />
      <Routes>
        <Route path="/" element={<App language={language} />} />
        <Route path="/login" element={<LoginPage language={language} />} />
      </Routes>
      <Footer />
    </Router>
  );
};

export default MainRouter;
