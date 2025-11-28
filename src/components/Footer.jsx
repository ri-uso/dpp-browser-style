import PropTypes from 'prop-types';
import { getLogos } from "../config/logos.js";

export default function Footer({ company }){
  const logos = getLogos(company);

  return (
    <footer className="container custom-footer">
      <img
        src={logos.footer}
        alt="Progetto realizzato grazie ai fondi europei della Regione Emilia-Romagna"
        className="footer-image"
        loading="lazy"
      />
    </footer>
  );
}

Footer.propTypes = {
  company: PropTypes.string.isRequired
};
