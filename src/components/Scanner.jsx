import { Html5QrcodeScanner } from "html5-qrcode";
// Import "profondo" non ufficiale: html5-qrcode non espone Html5QrcodeScannerStrings
// dal suo entry point pubblico, quindi va importato dal file interno. Fragile in
// caso di aggiornamento della libreria (verificare se il path cambia).
import { Html5QrcodeScannerStrings } from "html5-qrcode/esm/strings";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import PropTypes from 'prop-types';

// I testi dei controlli dello scanner (permessi camera, upload immagine, ecc.)
// sono hardcoded in inglese dalla libreria html5-qrcode (con un typo:
// "No image choosen"). Li sovrascriviamo in italiano, lingua principale
// dell'app: lo scanner non riceve la lingua attiva dell'utente, quindi qui
// non è dinamico rispetto a IT/EN/ES/FR.
Html5QrcodeScannerStrings.cameraPermissionTitle = () => "Richiedi permessi fotocamera";
Html5QrcodeScannerStrings.cameraPermissionRequesting = () => "Richiesta permessi fotocamera...";
Html5QrcodeScannerStrings.noCameraFound = () => "Nessuna fotocamera trovata";
Html5QrcodeScannerStrings.scanButtonStopScanningText = () => "Interrompi scansione";
Html5QrcodeScannerStrings.scanButtonStartScanningText = () => "Avvia scansione";
Html5QrcodeScannerStrings.scanButtonScanningStarting = () => "Avvio fotocamera...";
Html5QrcodeScannerStrings.torchOnButton = () => "Accendi torcia";
Html5QrcodeScannerStrings.torchOffButton = () => "Spegni torcia";
Html5QrcodeScannerStrings.torchOnFailedMessage = () => "Impossibile accendere la torcia";
Html5QrcodeScannerStrings.torchOffFailedMessage = () => "Impossibile spegnere la torcia";
Html5QrcodeScannerStrings.textIfCameraScanSelected = () => "Scansiona un file immagine";
Html5QrcodeScannerStrings.textIfFileScanSelected = () => "Scansiona direttamente con la fotocamera";
Html5QrcodeScannerStrings.selectCamera = () => "Seleziona fotocamera";
Html5QrcodeScannerStrings.fileSelectionChooseImage = () => "Scegli immagine";
Html5QrcodeScannerStrings.fileSelectionChooseAnother = () => "Scegli un'altra immagine";
Html5QrcodeScannerStrings.fileSelectionNoImageSelected = () => "Nessuna immagine selezionata";
Html5QrcodeScannerStrings.dragAndDropMessage = () => "Oppure trascina qui un'immagine da scansionare";
Html5QrcodeScannerStrings.dragAndDropMessageOnlyImages = () => "Oppure trascina qui un'immagine da scansionare (altri file non supportati)";
Html5QrcodeScannerStrings.zoom = () => "zoom";
Html5QrcodeScannerStrings.loadingImage = () => "Caricamento immagine...";
Html5QrcodeScannerStrings.scanningStatus = () => "Scansione in corso";
Html5QrcodeScannerStrings.idleStatus = () => "In attesa";
Html5QrcodeScannerStrings.errorStatus = () => "Errore";
Html5QrcodeScannerStrings.permissionStatus = () => "Permesso";
Html5QrcodeScannerStrings.noCameraFoundErrorStatus = () => "Nessuna fotocamera";

function Scanner({ loadNewElement }) {
  const scannerRef = useRef(null);
  const isMountedRef = useRef(true);
  const [, setSearchParams] = useSearchParams();

  useEffect(() => {
    isMountedRef.current = true;

    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        qrbox: { height: 250, width: 250, },
        fps: 10,
        rememberLastUsedCamera: true,
      },
      false);

    scannerRef.current = scanner;

    function success(result) {
      if (!result || !isMountedRef.current) return;

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

      // 4) Update company_code in URL so MainRouter re-applies brand colors
      if (company) {
        setSearchParams({ company_code: company });
      }

      // 5) Fire off your loader and tear down
      loadNewElement({ api_url: finalUrl });
      if (isMountedRef.current) {
        scanner.clear().catch(e => console.error("clear failed", e));
      }
    }


    function error(error){
      console.warn(error);
    }

    scanner.render(success, error);

    return () => {
      isMountedRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {
          // Ignore errors during cleanup - DOM elements may already be removed
        });
      }
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
