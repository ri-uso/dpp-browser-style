import PropTypes from "prop-types";
import '../styles/Footer.css';

function Footer({ imageSrc }) {
    return (
        <footer className="custom-footer">
            <img src={imageSrc} alt="Footer" className="footer-image" />
        </footer>
    )
}
Footer.propTypes = {
    imageSrc: PropTypes.string.isRequired
}
export default Footer;