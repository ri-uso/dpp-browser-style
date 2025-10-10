import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";
import PropTypes from 'prop-types';

function Scanner({ loadNewElement }) {

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        qrbox: { height: 250, width: 250, },
        fps: 10,
        rememberLastUsedCamera: true,
      },
      false)

    function success(result) {
      if (!result) return;

      // if there's no "?" but we see query‑style "=", insert it
      let fixed = result;
      if (!fixed.includes('?') && fixed.includes('.app/')) {
        fixed = fixed.replace('.app/', '.app/?');
      }

      // 1) Parse the incoming URL and grab its params
      const qr = new URL(fixed);
      const p  = qr.searchParams;
      const batch   = p.get('batch_code');            // e.g. "MG01S-A"
      const item    = p.get('item_code');             // e.g. "MG01S"
      const family  = p.get('productfamily_code');    // e.g. "MG"
      const company = p.get('company_code');          // e.g. "GreenFashionLab"
      const lang    = p.get('lang');                  // e.g. "IT"

      // 2) Decode the dpp_software URL and pull out its host+pathname
      const rawSoftware = p.get('dpp_software') || "";
      const decoded     = decodeURIComponent(rawSoftware);
      const swUrl       = new URL(decoded);
      // swUrl.host = "80.211.143.55"
      // swUrl.pathname = "/browser-protocol/get_batch_details/"
      const hostAndPath = `${swUrl.host}${swUrl.pathname}`.replace(/\/$/, ""); 
      // → "80.211.143.55/browser-protocol/get_batch_details"

      // 3) Build your final URL under the -omega host
      // const appBase = "https://dpp-browser-omega.vercel.app";
      const finalUrl = `https://${hostAndPath}/${batch}/${item}/${family}/${company}/${lang}`;

      // 4) Fire off your loader and tear down
      loadNewElement({ api_url: finalUrl });
      scanner.clear().catch(e => console.error("clear failed", e));
    }

  
    function error(error){
      console.warn(error);
    }
  
    scanner.render(success, error);

    return () => {
      console.log("Cleaning up scanner...");
       scanner.clear().catch(error => {
         console.error("Failed to clear html5-qrcode scanner on unmount.", error);
       });
    };
  
  }, [loadNewElement]);

  return (
    <div>
      <div id="reader" style={{ width: '100%', maxWidth: '500px', margin: 'auto', border: '0px' }}></div>
    </div>
  )
}
Scanner.propTypes = {
  loadNewElement: PropTypes.func.isRequired,
};

export default Scanner;
