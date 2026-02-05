import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CompareForms from "./components/CompareForms.jsx";
import { compareDppDatas } from './utilities.jsx';
import { getIdToken } from "./components/AuthService.jsx";
import MainPage from "./MainPage";
import translations from "./components/Translations.json";
import PropTypes from 'prop-types';

function App({ language }) {
  const location = useLocation();
  const [data, setData] = useState();
  const [error, setError] = useState(null);
  const [back_button_visible, setBackButtonVisible] = useState(false);
  const [parent_list, setParentList] = useState([]);
  const [compare_list, setCompareList] = useState([]);
  const [show_compare, setShowCompare] = useState(false);
  const [data_history, setDataHistory] = useState([]);
  const [show_confirmation_popup, setShowConfirmationPopup] = useState(false);
  const [show_select_popup, setShowSelectPopup] = useState(false);
  const [ask_to_compare, setAskToCompare] = useState(true);
  const [showOutput, setShowOutput] = useState(false);

  const [loading, setLoading] = useState(false);
  const [openScanner, setOpenScanner] = useState(false);

  // Reset alla home quando si clicca sul logo nell'header
  useEffect(() => {
    if (location.pathname === '/' && location.key !== 'default') {
      setShowOutput(false);
      setShowCompare(false);
    }
  }, [location]);

  const handleAskToCompareCheckbox = (event) => {
    setAskToCompare(event.target.checked);
  };

  const addElementToHistory = (newElement) => {
    const is_already_in_list = data_history.some((existingItem) => {
      return compareDppDatas(newElement, existingItem) === 0;
    });

    if (!is_already_in_list) {
      setDataHistory([...data_history, newElement]);
    }
  };

  useEffect(() => {
    if (data_history.length >= 2 && ask_to_compare) {
      setShowConfirmationPopup(true);
    }
  }, [data_history, ask_to_compare]);

  useEffect(() => {
    const origin   = window.location.origin;
    const basePath = import.meta?.env?.BASE_URL ?? '/';
    const appBase  = `${origin}${basePath}`;

    const href = window.location.href;
    if (!href.startsWith(appBase)) return;

    // strip off the base
    const extra = href.slice(appBase.length);
    if (!extra.trim()) return;    // no deep‑link data

    let apiUrl;

    if (extra.includes('=') && !extra.startsWith('/')) {
      // ─── new "query‑string" style: ?batch_code=…&…&dpp_software=…
      const qs = extra.startsWith('?') ? extra : `?${extra}`;
      const params = new URLSearchParams(qs);

      const batch   = params.get('batch_code');
      const item    = params.get('item_code');
      const family  = params.get('productfamily_code');
      const company = params.get('company_code');
      const lang    = params.get('lang');
      const swRaw   = params.get('dpp_software') || '';

      // Only process deep link if all required parameters are present
      if (!swRaw || !batch || !item || !family || !company || !lang) {
        return; // Skip deep link processing if parameters are missing
      }

      const swUrl   = new URL(decodeURIComponent(swRaw));
      const hostAndPath = `${swUrl.host}${swUrl.pathname}`.replace(/\/$/, '');

      apiUrl = [
        'https:/',
        hostAndPath,
        batch, item, family, company, lang
      ].join('/');
    } else {
      // ─── old “path‑style”: extra === "80.211.143.55/.../it/?format=json"
      // just prefix with https:// and call it a day
      apiUrl = `https://${extra}`;
    }

    // fire off your loader
    loadNewElement({ api_url: apiUrl });

    // wipe the extra off the URL bar
    window.history.replaceState({}, document.title, appBase);
  }, []);

  const pushElement = (new_element) => {
    if (new_element) {
      setParentList([...parent_list, new_element]);
      setBackButtonVisible(true);
    }
  };

  const popElement = () => {
    if (parent_list.length > 0) {
      const element = parent_list.shift();
      setParentList([...parent_list]);
      setBackButtonVisible(parent_list.length > 0);
      return element;
    }
    return null;
  };

  const handleBackButtonClick = () => {
    const new_data = popElement();
    setData(new_data);
  };

  const fetchData = async ({ api_url }) => {
    // ⬇️ NEW: inizio loading
    setLoading(true);
    try {
      if (!api_url.endsWith("/?format=json")) {
        if (!api_url.endsWith("/")) {
          api_url = `${api_url}/`;
        }
        api_url = `${api_url}?format=json`;
      }

      setError(null);

      const token = await getIdToken();

      const response = await fetch(api_url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const text = await response.text();
      console.log("Response text:", text);

      if (!response.ok) {
        throw new Error(`Errore nella richiesta: ${response.status}`);
      }

      try {
        const jsonData = JSON.parse(text);
        setData(jsonData);
        //const parsed = new URL(api_url);
        //const host = parsed.hostname;
        //if (jsonData?.linked_batches && Array.isArray(jsonData.linked_batches)) {
         // jsonData.linked_batches = jsonData.linked_batches.map(batch => {
          //  if (!batch.company_webservice || batch.company_webservice.trim() === "") {
           //   return { ...batch, company_webservice: host };
           // }
          //  return batch;
         // });
        //} 
        return jsonData;
      } catch (e) {
        setError("La risposta non è un JSON valido.");
        console.error("Parsing JSON fallito:", e);
        return null;
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      // ⬇️ NEW: fine loading sempre
      setLoading(false);
    }
  };

  const loadNewElement = async ({ api_url, save_parent = false, onComplete }) => {
    const parent_data = data;
    const new_element_data = await fetchData({ api_url });

    if (new_element_data) {
      if (save_parent) {
        pushElement(parent_data);
      }

      addElementToHistory(new_element_data);

      if (onComplete) {
        onComplete();
      }
      setShowOutput(true);
    }
  };

  const handleCloseConfirmationPopup = () => {
    setShowConfirmationPopup(false);
  };

  const handleConfirmPopup = () => {
    setShowConfirmationPopup(false);
    setShowSelectPopup(true);
  };

  const handleCloseSelectPopup = () => {
    setShowSelectPopup(false);
  };

  const handleConfirmCompare = (itemsArray) => {
    setShowSelectPopup(false);

    const allItems = [data, ...itemsArray];
    const uniqueMap = new Map();

    allItems.forEach(item => {
      const code = item.summary.item_code;
      if (!uniqueMap.has(code)) {
        uniqueMap.set(code, item);
      }
    });

    const uniqueList = Array.from(uniqueMap.values());

    setCompareList(uniqueList);
    setShowCompare(true);
  };

  return (
    <main className="container">
      {error ? (
        <div className="error-container">
          <p>{error}</p>
          <button
            onClick={() => {
              setError(null);
            }}
            className="btn-error"
          >
            {translations[language].btn_back}
          </button>
        </div>
      ) : show_compare && Array.isArray(compare_list) && compare_list.length > 0 ? (
        <CompareForms
          dataList={compare_list}
          setShowCompare={setShowCompare}
          language={language}
          onAddProduct={() => {
            setShowCompare(false);
            setShowOutput(false);
            setOpenScanner(true);
          }}
        />
      ) : (
        <MainPage
          data={data}
          setData={setData}
          loadNewElement={loadNewElement}
          error={error}
          back_button_visible={back_button_visible}
          handleBackButtonClick={handleBackButtonClick}
          data_history={data_history}
          compare_list={compare_list}
          setShowSelectPopup={setShowSelectPopup}
          show_select_popup={show_select_popup}
          setDataHistory={setDataHistory}
          show_confirmation_popup={show_confirmation_popup}
          handleCloseConfirmationPopup={handleCloseConfirmationPopup}
          handleConfirmPopup={handleConfirmPopup}
          ask_to_compare={ask_to_compare}
          handleAskToCompareCheckbox={handleAskToCompareCheckbox}
          handleCloseSelectPopup={handleCloseSelectPopup}
          handleConfirmCompare={handleConfirmCompare}
          language={language}
          showOutput={showOutput}
          setShowOutput={setShowOutput}
          loading={loading}
          openScanner={openScanner}
          setOpenScanner={setOpenScanner}   
        />
      )}
    </main>
  );
}

App.propTypes = {
  language: PropTypes.string.isRequired
};

export default App;
