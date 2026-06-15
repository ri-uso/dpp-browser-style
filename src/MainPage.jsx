
// src/components/MainPage.jsx
import React, { useEffect, useRef, useState } from "react";
import InputForm from "./components/InputForm";
import OutputForm from "./components/OutputForm";
import LinkedBatches from "./components/LinkedBatches";
import ComparePopup from "./components/ComparePopup";
import SelectListPopup from "./components/SelectListPopup";
import ProductInfo from "./components/ProductInfo";
import CompanySection from "./components/CompanySection";
import translations from "./components/Translations.json";
import PropTypes from 'prop-types';
import { Columns2, ArrowLeft, QrCode } from "lucide-react";
import AOS from 'aos';
import { getDirectImageUrl } from './utilities.jsx';
import './styles/MainPage.css';

/* Sticky header con IntersectionObserver — più affidabile del CSS sticky puro */
function StickyHeader({ text, headerHeight }) {
  const sentinelRef = useRef(null);
  const headerRef   = useRef(null);
  const [isStuck, setIsStuck]           = useState(false);
  const [placeholderH, setPlaceholderH] = useState(0);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: `-${headerHeight}px 0px 0px 0px` }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [headerHeight]);

  useEffect(() => {
    if (headerRef.current) {
      setPlaceholderH(headerRef.current.getBoundingClientRect().height);
    }
  }, [text]);

  return (
    <>
      {/* sentinel: quando esce dalla viewport il header si blocca */}
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
      {/* placeholder evita il layout jump quando il header diventa fixed */}
      {isStuck && <div style={{ height: placeholderH }} aria-hidden="true" />}
      <div
        ref={headerRef}
        className={`form-sticky-header${isStuck ? ' form-sticky-header--stuck' : ''}`}
        style={isStuck
          ? { position: 'fixed', top: headerHeight, left: 0, right: 0, zIndex: 10 }
          : {}
        }
      >
        <h2 className="sticky-header-title">{text}</h2>
      </div>
    </>
  );
}
StickyHeader.propTypes = {
  text: PropTypes.string.isRequired,
  headerHeight: PropTypes.number.isRequired,
};

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
  setShowOutput,
  openScanner,
  setOpenScanner,
  loading,
}) {
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    AOS.init({
      duration: 700,
      easing: 'ease-in-out',
      once: true,
    });
  }, []);

  useEffect(() => {
    function measure() {
      const mainHeader = document.querySelector(".main-header");
      if (mainHeader) {
        const pos = getComputedStyle(mainHeader).position;
        setHeaderHeight(pos === "fixed" ? mainHeader.getBoundingClientRect().height : 0);
      } else {
        setHeaderHeight(0);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const renderForm = (form, index) => {
    const name = form.form_name;

    if (name === 'LOGO') {
      const logoField = form.fields
        .map(f => data.data.find(d => String(d.ID) === String(f.ID)))
        .find(d => d?.value_url_type?.toUpperCase() === 'IMAGE');
      return logoField ? (
        <div className="logo-form-wrap" key={index} data-aos="fade-down">
          <img src={getDirectImageUrl(logoField.value_url)} alt="Logo" className="logo-form-img" />
        </div>
      ) : null;
    }

    if (name === '#LOGOCOMPANY') {
      const logoField = form.fields
        .map(f => data.data.find(d => String(d.ID) === String(f.ID)))
        .find(d => d?.value_url_type?.toUpperCase() === 'IMAGE');
      return logoField ? (
        <div className="logo-form-wrap" key={index} data-aos="fade-down">
          <img src={getDirectImageUrl(logoField.value_url)} alt="Logo" className="logo-form-img" />
        </div>
      ) : null;
    }

    if (name === '#HEADER') {
      const headerTextField = form.fields
        .map(f => data.data.find(d => String(d.ID) === String(f.ID)))
        .find(d => d?.value_text);
      const displayText = headerTextField?.value_text || data.summary?.item_name;
      if (!displayText) return null;
      return (
        <StickyHeader key={index} text={displayText} headerHeight={headerHeight} />
      );
    }

    if (name === '#BATCH-ITEM-PRODUCTFAMILY') {
      return (
        <React.Fragment key={index}>
          <ProductInfo summary={data.summary} language={language} />
          {form.fields.length > 0 && (
            <div className="output-row">
              <OutputForm form={{ ...form, form_name: '' }} data_list={data.data} language={language} />
            </div>
          )}
        </React.Fragment>
      );
    }

    if (name === '#COMPANY') {
      return (
        <React.Fragment key={index}>
          <CompanySection summary={data.summary} />
          {form.fields.length > 0 && (
            <div className="output-row">
              <OutputForm form={{ ...form, form_name: '' }} data_list={data.data} language={language} />
            </div>
          )}
        </React.Fragment>
      );
    }

    return (
      <div className="output-row" key={index}>
        <OutputForm form={form} data_list={data.data} language={language} />
      </div>
    );
  };

  return (
    <>
      {/* Overlay di caricamento */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="loading-spinner__ring" />
            <div className="loading-spinner__ring loading-spinner__ring--delay" />
          </div>
          <span className="loading-overlay__label">{translations[language].loading_text}</span>
        </div>
      )}

      <div className={`page-content${loading ? ' page-content--loading' : ''}`}>
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
                    <span>{translations[language].back_text}</span>
                  </button>

                  <button
                    className="nav-btn nav-btn--primary"
                    onClick={() => {
                      setShowOutput(false);
                      setOpenScanner(true);
                    }}
                  >
                    <QrCode size={18} />
                    <span>{translations[language].scan_another_text}</span>
                  </button>
                </div>

                {/* Form speciali e normali, ordinati dal JSON */}
                <div className="forms-list-wrapper">
                  <div className="forms-list">
                    {data.forms.filter(f => Array.isArray(f.fields)).map((form, index) =>
                      renderForm(form, index)
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <InputForm loadNewElement={loadNewElement} language={language} openScanner={openScanner} setOpenScanner={setOpenScanner} />
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
      </div>

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
  openScanner: PropTypes.bool,
  setOpenScanner: PropTypes.func,
};

export default MainPage;
