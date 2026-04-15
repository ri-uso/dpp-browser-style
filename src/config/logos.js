// Configuration file for company logos
// Add new companies here with their respective header and footer logos

export const logoConfig = {
    // Company code must be written here in lowercase
      "dpp": {
    header: "/logos/Header_RiUso.png",
    footer: "/logos/Footer_RiUso.png"
  },
    "chierici": {
    header: "/logos/Header_RiUso.png",
    footer: "/logos/Footer_RiUso.png"
  },
    "emmestore": {
    header: "/logos/Header_RiUso.png",
    footer: "/logos/Footer_RiUso.png"
  },
    "texart": {
    header: "/logos/Header_RiUso.png",
    footer: "/logos/Footer_RiUso.png"
  },
    "shiningstar": {
    header: "/logos/Header_ShiningStar.png",
    footer: "/logos/Footer_CentroQualitaTessile_CarpiFashionSystem.png"
  },
    "greenfashionlab": {
    header: "/logos/Header_GreenFashionLab.png",
    footer: "/logos/Footer_CentroQualitaTessile_CarpiFashionSystem.png"
  },
    "Serviziitalia": {
    header: "/logos/Header_RiUso.png",
    footer: "/logos/Footer_RiUso.png"
  },
    "interfil": {
    header: "/logos/Header_RiUso.png",
    footer: "/logos/Footer_RiUso.png"
  },
    "staffjersey": {
    header: "/logos/Header_RiUso.png",
    footer: "/logos/Footer_RiUso.png"
  },
    "aziendaprova": {
    header: "/logos/Header_RiUso.png",
    footer: "/logos/Footer_RiUso.png"
  },
    "bottonificiosrl": {
    header: "/logos/Header_RiUso.png",
    footer: "/logos/Footer_RiUso.png"
  },
    "filaturaspa": {
    header: "/logos/Header_RiUso.png",
    footer: "/logos/Footer_RiUso.png"
  },
  "utildeco-example": {
    header: "/logos/Header_Utildeco_Vinnovate.png",
    footer: "/logos/Footer_Utildeco_Vinnovate.png",
    accessibilityWidget: true
  },
    "souvenirclubbingsrl": {
    header: "/logos/Header_Centergross.png",
    footer: "/logos/Footer_Centergross.png"
  },
    "prontomodabologna": {
    header: "/logos/Header_Centergross.png",
    footer: "/logos/Footer_Centergross.png"
  },
    "sophiacurvy": {
    header: "/logos/Header_Centergross.png",
    footer: "/logos/Footer_Centergross.png"
  },
    "moteldiffusionemodasrl": {
    header: "/logos/Header_Centergross.png",
    footer: "/logos/Footer_Centergross.png"
  },
    "robertagandolfisrl": {
    header: "/logos/Header_Centergross.png",
    footer: "/logos/Footer_Centergross.png"
  },
    "stiledonna": {
    header: "/logos/Header_Centergross.png",
    footer: "/logos/Footer_Centergross.png"
  },
  "staffjerseyjf": {
    header: "/logos/Header_Staff_Jersey_Just_Fashion.png",
    footer: "/logos/Footer_Staff_Jersey_Just_Fashion.png"
  },
  "REAM": {
    header: "/logos/Header_REAM.png",
    footer: "/logos/Footer_REAM.png"
  },
  "biotex": {
    header: "/logos/Header_logo_Biotex.png",
    footer: "/logos/Footer_Biotex_cqt.jpg",
    colors: {
      brand:       '#c8102e',
      brand600:    '#a50c25',
      logo500:     '#c8102e',
      logo400:     '#e0294a',
      logo300:     '#f06070',
      logo100:     '#fce8ec',
      grad:        'linear-gradient(90deg, #1a1a2e 0%, #8b0000 50%, #c8102e 100%)',
      gradNav:     'linear-gradient(135deg, #1a1a2e 0%, #8b0000 50%, #c8102e 100%)',
      shadowBrand: '0 4px 14px rgba(200, 16, 46, 0.4)',
      cmpBrand1:   '#c8102e',
      cmpBrand2:   '#8b0000',
      cmpBrand3:   '#e0294a',
      btnBg:       '#c8102e',
    }
  },

  

  // Example for adding new company:
  // azienda2: {  //Company code must be written here in lowercase
  //   header: "/logos/header-azienda2.png",
  //   footer: "/logos/footer-azienda2.png"
  // }
};

// Default company if no parameter is provided or company not found
export const defaultCompany = 'dpp';

/**
 * Get logo paths for a specific company
 * @param {string} companyCode - Company code identifier
 * @returns {object} Object with header and footer logo paths
 */
export const getLogos = (companyCode) => {
  return logoConfig[companyCode] || logoConfig[defaultCompany];
};

/**
 * Apply company brand colors as CSS custom properties on <html>.
 * If the company has no `colors` defined, resets to the default CSS values.
 * @param {string} companyCode - Company code identifier
 */
export const applyCompanyColors = (companyCode) => {
  const config = logoConfig[companyCode] || logoConfig[defaultCompany];
  const root = document.documentElement;

  const VARS = [
    '--brand', '--brand-600', '--logo-500', '--logo-400', '--logo-300', '--logo-100',
    '--grad', '--grad-nav-primary', '--shadow-brand',
    '--cmp-brand1', '--cmp-brand2', '--cmp-brand3',
    '--btn-bg',
  ];

  if (config.colors) {
    const c = config.colors;
    root.style.setProperty('--brand',            c.brand);
    root.style.setProperty('--brand-600',        c.brand600);
    root.style.setProperty('--logo-500',         c.logo500);
    root.style.setProperty('--logo-400',         c.logo400);
    root.style.setProperty('--logo-300',         c.logo300);
    root.style.setProperty('--logo-100',         c.logo100);
    root.style.setProperty('--grad',             c.grad);
    root.style.setProperty('--grad-nav-primary', c.gradNav);
    root.style.setProperty('--shadow-brand',     c.shadowBrand);
    root.style.setProperty('--cmp-brand1',       c.cmpBrand1);
    root.style.setProperty('--cmp-brand2',       c.cmpBrand2);
    root.style.setProperty('--cmp-brand3',       c.cmpBrand3);
    root.style.setProperty('--btn-bg',           c.btnBg);
  } else {
    VARS.forEach(v => root.style.removeProperty(v));
  }
};

/**
 * Returns true if the company has opted in to the accessibility widget.
 * @param {string} companyCode - Company code identifier
 * @returns {boolean}
 */
export const hasAccessibilityWidget = (companyCode) => {
  const config = logoConfig[companyCode] ?? logoConfig[defaultCompany];
  return config?.accessibilityWidget === true;
};