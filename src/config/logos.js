// Configuration file for company logos
// Add new companies here with their respective header and footer logos

export const logoConfig = {
    // Company code must be written here in lowercase
      "dpp": {
    header: "/logos/Header_RiUso.png",
    footer: "/logos/Footer_RiUso.png"
  },
  "utildeco-example": {
    header: "/logos/Header_Utildeco_Vinnovate.png",
    footer: "/logos/Footer_Utildeco_Vinnovate.png"
  },
    "prontomodabologna": {
    header: "/logos/Header_Centergross.png",
    footer: "/logos/Footer_Centergross.png"
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