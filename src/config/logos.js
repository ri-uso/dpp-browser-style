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
    header: "/logos/Header_CarpiFasionSystem.jpg",
    footer: "/logos/Footer_CentroQualitaTessile_CarpiFashionSystem.png"
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
    footer: "/logos/Footer_Utildeco_Vinnovate.png"
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