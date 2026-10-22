import { Html5QrcodeScanner } from "html5-qrcode";
// Import "profondo" non ufficiale: html5-qrcode non espone Html5QrcodeScannerStrings
// dal suo entry point pubblico, quindi va importato dal file interno. Fragile in
// caso di aggiornamento della libreria (verificare se il path cambia).
import { Html5QrcodeScannerStrings } from "html5-qrcode/esm/strings";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import PropTypes from 'prop-types';
import translations from './Translations.json';

// I testi dei controlli dello scanner (permessi camera, upload immagine, ecc.)
// sono hardcoded in inglese dalla libreria html5-qrcode (con un typo:
// "No image choosen"). Li sovrascriviamo con la lingua attiva dell'app
// (chiavi qr_scanner_*_text in Translations.json) ogni volta che lo scanner
// si monta, perche' la libreria li legge dall'oggetto globale.
function applyScannerStrings(t) {
  const S = Html5QrcodeScannerStrings;
  S.cameraPermissionTitle = () => t.qr_scanner_camera_permission_title_text;
  S.cameraPermissionRequesting = () => t.qr_scanner_camera_permission_requesting_text;
  S.noCameraFound = () => t.qr_scanner_no_camera_found_text;
  S.scanButtonStopScanningText = () => t.qr_scanner_stop_scanning_text;
  S.scanButtonStartScanningText = () => t.qr_scanner_start_scanning_text;
  S.scanButtonScanningStarting = () => t.qr_scanner_scan_starting_text;
  S.torchOnButton = () => t.qr_scanner_torch_on_text;
  S.torchOffButton = () => t.qr_scanner_torch_off_text;
  S.torchOnFailedMessage = () => t.qr_scanner_torch_on_failed_text;
  S.torchOffFailedMessage = () => t.qr_scanner_torch_off_failed_text;
  S.textIfCameraScanSelected = () => t.qr_scanner_scan_image_file_text;
  S.textIfFileScanSelected = () => t.qr_scanner_scan_with_camera_text;
  S.selectCamera = () => t.qr_scanner_select_camera_text;
  S.fileSelectionChooseImage = () => t.qr_scanner_choose_image_text;
  S.fileSelectionChooseAnother = () => t.qr_scanner_choose_another_image_text;
  S.fileSelectionNoImageSelected = () => "";
  S.dragAndDropMessage = () => t.qr_scanner_drag_drop_text;
  S.dragAndDropMessageOnlyImages = () => t.qr_scanner_drag_drop_only_images_text;
  S.zoom = () => t.qr_scanner_zoom_text;
  S.loadingImage = () => t.qr_scanner_loading_image_text;
  S.scanningStatus = () => t.qr_scanner_status_scanning_text;
  S.idleStatus = () => t.qr_scanner_status_idle_text;
  S.errorStatus = () => t.qr_scanner_status_error_text;
  S.permissionStatus = () => t.qr_scanner_status_permission_text;
  S.noCameraFoundErrorStatus = () => t.qr_scanner_status_no_camera_text;
}

function Scanner({ loadNewElement, language }) {
  const scannerRef = useRef(null);
  const isMountedRef = useRef(true);
  const [, setSearchParams] = useSearchParams();

  useEffect(() => {
    isMountedRef.current = true;

    applyScannerStrings(translations[language] || translations.IT);

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

    // La libreria mostra troppi controlli superflui per l'utente finale:
    // un messaggio "trascina qui" non cliccabile e la coda " - " lasciata
    // dal testo del bottone file (svuotato sopra). Ne bastano solo due:
    // il pulsante dei permessi fotocamera e "Seleziona immagine".
    const fileSelectionButton = document.getElementById('html5-qrcode-button-file-selection');
    if (fileSelectionButton) {
      fileSelectionButton.textContent = fileSelectionButton.textContent.replace(/\s*-\s*$/, '');
    }
    const dragAndDropMessage = fileSelectionButton?.parentElement?.parentElement?.querySelector('div:last-child');
    if (dragAndDropMessage) {
      dragAndDropMessage.style.display = 'none';
    }

    return () => {
      isMountedRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {
          // Ignore errors during cleanup - DOM elements may already be removed
        });
      }
    };

  }, [loadNewElement, language]);

  return (
    <div>
      <div id="reader" style={{ width: '100%', maxWidth: '500px', margin: 'auto', border: '0px' }}></div>
    </div>
  )
}
Scanner.propTypes = {
  loadNewElement: PropTypes.func.isRequired,
  language: PropTypes.string,
};

export default Scanner;
