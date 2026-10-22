import PropTypes from 'prop-types';
import translations from "./Translations.json";
import { getLogos } from "../config/logos.js";

export default function Footer({ companyCode, language = "IT" }){
  const logos = getLogos(companyCode);

  if (!logos?.footer) return null;

  return (
    <footer className="container custom-footer">
      <img
        src={logos.footer}
        alt={(translations[language] ?? translations.IT).footer_funding_alt}
        className="footer-image"
        loading="lazy"
      />
    </footer>
  );
}

Footer.propTypes = {
  companyCode: PropTypes.string.isRequired,
  language: PropTypes.string
};
