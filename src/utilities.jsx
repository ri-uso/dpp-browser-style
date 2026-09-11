
export function getYouTubeId(url) {
  const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? match[1] : null;
}

export function pickItem(data_list, id, lang) {
  const list = Array.isArray(data_list) ? data_list.filter(it => String(it.ID) === String(id)) : [];
  if (!list.length) return null;
  const langLc = String(lang || "").toLowerCase();
  const exact = list.find(it => String(it.property_language || "").toLowerCase() === langLc);
  return exact || list[0] || null;
}

export function getDirectImageUrl(url) {
  const driveMatch = url?.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (driveMatch) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return url;
}

export function getApiUrl (url, batch_code, item_code, productfamily_code, company_code, language) {
  let api_url = `${url}/browser-protocol/get_batch_details/${batch_code}/${item_code}/${productfamily_code}/${company_code}/${language}/?format=json`;
  if (!api_url.startsWith("https://")) {
    api_url = `https://${api_url}`;
  }

  return api_url;
};
//Questa funzione confronta due oggetti data1 e data2
export function compareDppDatas(data1, data2) {
  // _identity (l'URL di richiesta, assegnato in fetchData di App.jsx) è
  // l'identificativo affidabile: alcuni backend (es. Biotex) non popolano
  // batch_code/item_code/productfamily_code/language in summary, e in quel
  // caso il confronto sottostante darebbe undefined === undefined su quei
  // campi, trattando prodotti diversi della stessa azienda come duplicati.
  if (data1?._identity && data2?._identity) {
    return data1._identity === data2._identity ? 0 : 1;
  }

  var result = 1;
  if (data1.summary.company_code === data2.summary.company_code &&
    data1.summary.productfamily_code === data2.summary.productfamily_code &&
    data1.summary.item_code === data2.summary.item_code &&
    data1.summary.batch_code === data2.summary.batch_code &&
    data1.summary.language === data2.summary.language) {
    result = 0
  }

  return result;
};
