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
      if (result) {
        loadNewElement({api_url:result});
      }
      
  
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
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
