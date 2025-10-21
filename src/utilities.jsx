
export function getApiUrl (url, batch_code, item_code, productfamily_code, company_code, language) {
  let api_url = `${url}/browser-protocol/get_batch_details/${batch_code}/${item_code}/${productfamily_code}/${company_code}/${language}/?format=json`;
  if (!api_url.startsWith("https://")) {
    api_url = `https://${api_url}`;
  }

  return api_url;
};
//Questa funzione confronta due oggetti data1 e data2
export function compareDppDatas(data1, data2) {
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
