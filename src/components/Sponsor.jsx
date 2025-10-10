// components/Footer.jsx
const sponsors = [
  { name: "CQT", url: "https://www.centroqualitatessile.it/", logo: "/images/cqt-logo.jpg" },
  { name: "TPMV", url: "https://tpm.bio/", logo: "/images/tpmv-logo.png" },
  { name: "Democenter", url: "https://www.democentersipe.it/", logo: "/images/democenter-logo.png" },
  { name: "Enea Cross-Tec", url: "https://www.cross-tec.enea.it/", logo: "/images/enea-logo.jpg" },
];

const companies = [
  { name: "Metodo", url: "https://www.metodo.net/", logo: "/images/metodo.png" },
  { name: "Servizi Italia", url: "https://www.servizitaliagroup.com/", logo: "/images/servizitalia.png" },
  { name: "Cadica Group", url: "https://www.cadica.com/it/", logo: "/images/cadica.png" },
  { name: "Qoncert", url: "https://www.qoncert.it/", logo: "/images/qoncert.png" },
  { name: "Garc Ambiente", url: "https://garcambiente.it/", logo: "/images/garc.png" },
  { name: "Staff Jersey", url: "https://www.staffjersey.it/", logo: "/images/staff.png" },
  { name: "PuntoArt", url: "https://puntoart.it/", logo: "/images/puntoart.png" },
  { name: "Bianco Accessori", url: "https://biancoaccessori.it/", logo: "/images/bianco.png" },
];

function LogosSection({ title, items, wrapperClass = "" }) {
  return (
    <section className={wrapperClass}>
      <div className="sponsors-heading">{title}</div>
      <div className="sponsors-rail" role="list" aria-label={title}>
        {items.map(s => (
          <a key={s.name} role="listitem" href={s.url} target="_blank" rel="noopener noreferrer"
             title={s.name} aria-label={s.name} className="sponsor-chip">
            <img src={s.logo} alt={s.name} loading="lazy" />
          </a>
        ))}
      </div>
    </section>
  );
}

function FundingBanner({ src, caption }) {
  return (
    <section className="funding-banner">
      <img src={src} alt="" loading="lazy" />
      <p className="funding-caption">{caption}</p>
    </section>
  );
}

export default function Footer(){
  return (
    <footer className="sponsors-footer">
      <LogosSection title="Partner"  items={sponsors}  wrapperClass="logos logos--sponsors" />
      <div className="logos-sep" aria-hidden="true" />
      <LogosSection title="Imprese"  items={companies} wrapperClass="logos logos--companies" />

      {/* Banner istituzionale sotto */}
      <FundingBanner
        src="./public/images/fondi.jpg"
       caption={
    <>
      PROGETTO REALIZZATO GRAZIE AI{" "}
      <span className="highlight">FONDI EUROPEI DELLA REGIONE EMILIA ROMAGNA</span>
    </>
  }
      />
    </footer>
  );
}


