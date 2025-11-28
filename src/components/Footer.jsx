import PropTypes from 'prop-types';
import { getLogos } from "../config/logos.js";

export default function Footer({ companyCode }){
  const logos = getLogos(companyCode);

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
  companyCode: PropTypes.string.isRequired
};
