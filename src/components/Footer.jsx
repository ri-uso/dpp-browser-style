import PropTypes from "prop-types";

export default function FooterImage(){
  return (
    <footer className="custom-footer">
      <img
        src="/images/Footer-DPP-browser.png"
        alt="Progetto realizzato grazie ai fondi europei della Regione Emilia-Romagna"
        className="footer-image"
        loading="lazy"
      />
    </footer>
  );
}