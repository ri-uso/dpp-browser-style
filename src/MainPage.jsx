
// src/components/MainPage.jsx
import InputForm from "./components/InputForm";
import OutputForm from "./components/OutputForm";
import LinkedBatches from "./components/LinkedBatches";
import ComparePopup from "./components/ComparePopup";
import SelectListPopup from "./components/SelectListPopup";
import translations from "./components/Translations.json";
import PropTypes from 'prop-types';
import { useEffect } from "react";
import { Columns2, ArrowLeft, QrCode } from "lucide-react";
import AOS from 'aos';

function MainPage({
  data,
  language,
  loadNewElement,
  data_history,
  setShowSelectPopup,
  show_confirmation_popup,
  handleCloseConfirmationPopup,
  handleConfirmPopup,
  show_select_popup,
  setDataHistory,
  ask_to_compare,
  handleAskToCompareCheckbox,
  handleCloseSelectPopup,
  handleConfirmCompare,
  showOutput,
  setShowOutput
}) {
  useEffect(() => {
    AOS.init({
      duration: 700,
      easing: 'ease-in-out',
      once: true,
    });
  }, []);
  return (
    <>
      {showOutput ? (
        <>


          {data && (
            <>
              {/* Barra navigazione prodotto */}
              <div className="product-nav-bar">
                <button
                  className="nav-btn nav-btn--back"
                  onClick={() => setShowOutput(false)}
                >
                  <ArrowLeft size={18} />
                  <span>Indietro</span>
                </button>

                <button
                  className="nav-btn nav-btn--primary"
                  onClick={() => {
                    const scanner = document.querySelector(".input-form-section, #reader, .qr-column");
                    if (scanner) {
                      scanner.scrollIntoView({ behavior: "smooth", block: "start" });
                    } else {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
                  <QrCode size={18} />
                  <span>Aggiungi prodotto</span>
                </button>
              </div>

              <div className="forms-list-wrapper" data-aos="fade-right">
                <h2 className="nome-prodotto mb-4">{data.summary.item_name}</h2>
                <div className="forms-list">
                  {data && data.forms.map((form, index) => (
                    <div className="output-row" key={index}>
                      <OutputForm
                        form={form}
                        data_list={data.data}
                        language={language}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <InputForm loadNewElement={loadNewElement} language={language} />
      )}

      {showOutput && data && (
        <>
          {data_history.length > 1 && (
            <button className="compare-btn" onClick={() => setShowSelectPopup(true)}>
              <Columns2 size={20} />
              {translations[language].compare_text}
            </button>
          )}

          {data.linked_batches.length > 0 && (
            <LinkedBatches
              loadNewElement={loadNewElement}
              linked_batches={data.linked_batches}
              language={language}
            />
          )}
        </>
      )}

      <ComparePopup
        show={show_confirmation_popup}
        handleClose={handleCloseConfirmationPopup}
        handleConfirm={handleConfirmPopup}
        language={language}
        productCount={data_history.length}
      />

      {show_select_popup &&
        <SelectListPopup
          show={show_select_popup}
          history={data_history}
          setHistory={setDataHistory}
          curr_element={data}
          ask_to_compare={ask_to_compare}
          handleAskToCompareCheckbox={handleAskToCompareCheckbox}
          handleClose={handleCloseSelectPopup}
          handleConfirmCompare={handleConfirmCompare}
          language={language}
        />
      }
    </>
  );
}

MainPage.propTypes = {
  data: PropTypes.object,
  error: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  language: PropTypes.string.isRequired,
  loadNewElement: PropTypes.func.isRequired,
  back_button_visible: PropTypes.bool.isRequired,
  handleBackButtonClick: PropTypes.func.isRequired,
  data_history: PropTypes.array.isRequired,
  setShowSelectPopup: PropTypes.func.isRequired,
  show_confirmation_popup: PropTypes.bool.isRequired,
  handleCloseConfirmationPopup: PropTypes.func.isRequired,
  handleConfirmPopup: PropTypes.func.isRequired,
  show_select_popup: PropTypes.bool.isRequired,
  setDataHistory: PropTypes.func.isRequired,
  ask_to_compare: PropTypes.bool.isRequired,
  handleAskToCompareCheckbox: PropTypes.func.isRequired,
  handleCloseSelectPopup: PropTypes.func.isRequired,
  handleConfirmCompare: PropTypes.func.isRequired,
  showOutput: PropTypes.bool.isRequired,
  setShowOutput: PropTypes.func.isRequired,
};

export default MainPage;
