import PropTypes from 'prop-types';
import { Factory, Globe, Mail, Phone, MapPin } from 'lucide-react';
import '../styles/CompanyFooter.css';

export default function CompanyFooter({ summary, language }) {
  const {
    company_legalname,
    company_shortname,
    company_vat,
    company_website,
    company_address,
    company_email,
    company_phonenumber,
  } = summary;

  const displayName = company_legalname || company_shortname;

  if (!displayName && !company_vat && !company_address && !company_email && !company_phonenumber && !company_website) {
    return null;
  }

  return (
    <div className="company-footer" data-aos="fade-up" data-aos-duration="600">
      <div className="company-footer__inner">

        <div className="company-footer__section">
          <span className="company-footer__section-label company-footer__section-label--company">
            <Factory size={15} />
          </span>
          <div className="company-footer__fields">
            {displayName && (
              <span className="company-footer__field company-footer__field--name">
                {displayName}
              </span>
            )}
            {company_vat && (
              <span className="company-footer__field">
                P.IVA&nbsp;{company_vat}
              </span>
            )}
            {company_address && (
              <span className="company-footer__field">
                <MapPin size={12} />{company_address}
              </span>
            )}
            {company_email && (
              <a className="company-footer__field company-footer__field--link" href={`mailto:${company_email}`}>
                <Mail size={12} />{company_email}
              </a>
            )}
            {company_phonenumber && (
              <a className="company-footer__field company-footer__field--link" href={`tel:${company_phonenumber}`}>
                <Phone size={12} />{company_phonenumber}
              </a>
            )}
            {company_website && (
              <a
                className="company-footer__field company-footer__field--link"
                href={company_website.startsWith('http') ? company_website : `https://${company_website}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe size={12} />{company_website}
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

CompanyFooter.propTypes = {
  language: PropTypes.string.isRequired,
  summary: PropTypes.shape({
    company_legalname: PropTypes.string,
    company_shortname: PropTypes.string,
    company_vat: PropTypes.string,
    company_website: PropTypes.string,
    company_address: PropTypes.string,
    company_email: PropTypes.string,
    company_phonenumber: PropTypes.string,
  }).isRequired,
};
