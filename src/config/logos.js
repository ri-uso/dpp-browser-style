// Configuration file for company logos
// Add new companies here with their respective header and footer logos

export const logoConfig = {
      dpp: {
    header: "/logos/HeaderDPP.png",
    footer: "/logos/Footer-DPP-browser.png"
  },
  centergross: {
    header: "/logos/HeaderCentergross.png",
    footer: "/logos/FooterCentergross.png"
  },

  // Example for adding new company:
  // azienda2: {
  //   header: "/logos/header-azienda2.png",
  //   footer: "/logos/footer-azienda2.png"
  // }
};

// Default company if no parameter is provided or company not found
export const defaultCompany = 'dpp';

/**
 * Get logo paths for a specific company
 * @param {string} company - Company identifier
 * @returns {object} Object with header and footer logo paths
 */
export const getLogos = (company) => {
  return logoConfig[company] || logoConfig[defaultCompany];
};