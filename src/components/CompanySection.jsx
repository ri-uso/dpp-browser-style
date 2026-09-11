import PropTypes from 'prop-types';
import { MapPin, Mail, Phone, Globe } from 'lucide-react';
import '../styles/CompanySection.css';

export default function CompanySection({ summary }) {
  const {
    company_legalname,
    company_shortname,
    company_vat,
    company_address,
    company_email,
    company_phonenumber,
    company_website,
  } = summary ?? {};

  const name = company_legalname || company_shortname;
  const hasAny = name || company_vat || company_address || company_email || company_phonenumber || company_website;

  if (!hasAny) return null;

  const websiteHref = company_website
    ? (company_website.startsWith('http') ? company_website : `https://${company_website}`)
    : null;

  return (
    <div className="company-section" data-aos="fade-up">
      <div className="company-section__flat">

        {name && (
          <div className="company-section__row">
            <span className="company-section__row-label">Azienda</span>
            <span className="company-section__row-value company-section__val--name">{name}</span>
          </div>
        )}

        {company_vat && (
          <div className="company-section__row">
            <span className="company-section__row-label">P.IVA</span>
            <span className="company-section__row-value">{company_vat}</span>
          </div>
        )}

        {company_address && (
          <div className="company-section__row">
            <span className="company-section__row-label"><MapPin size={11} />Indirizzo</span>
            <span className="company-section__row-value">{company_address}</span>
          </div>
        )}

        {company_email && (
          <div className="company-section__row">
            <span className="company-section__row-label"><Mail size={11} />Email</span>
            <a className="company-section__row-value company-section__link" href={`mailto:${company_email}`}>{company_email}</a>
          </div>
        )}

        {company_phonenumber && (
          <div className="company-section__row">
            <span className="company-section__row-label"><Phone size={11} />Telefono</span>
            <a className="company-section__row-value company-section__link" href={`tel:${company_phonenumber}`}>{company_phonenumber}</a>
          </div>
        )}

        {websiteHref && (
          <div className="company-section__row">
            <span className="company-section__row-label"><Globe size={11} />Sito web</span>
            <a className="company-section__row-value company-section__link" href={websiteHref} target="_blank" rel="noopener noreferrer">{company_website}</a>
          </div>
        )}

      </div>
    </div>
  );
}

CompanySection.propTypes = {
  summary: PropTypes.shape({
    company_legalname: PropTypes.string,
    company_shortname: PropTypes.string,
    company_vat: PropTypes.string,
    company_address: PropTypes.string,
    company_email: PropTypes.string,
    company_phonenumber: PropTypes.string,
    company_website: PropTypes.string,
  }).isRequired,
};
