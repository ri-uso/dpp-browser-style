import CompareForm from "./CompareForm";
import PropTypes from 'prop-types';
import {ArrowLeft} from "lucide-react";
import "../styles/CompareForms.css";
import "../styles/CompareForm.css"

const getFormNameList = (dataList) => {

  if (!Array.isArray(dataList) || dataList.length === 0) return [];
 
  return dataList
    .map(data => data.forms.map(f => f.form_name))

    .reduce((a, b) => a.filter(name => b.includes(name)));

};


function CompareForms({ dataList, setShowCompare, language }) {


    const getHeaderColorClass = (total, idx) => {
  if (total === 1) return 'bg-color-center';
  if (total === 2) return idx === 0 ? 'bg-color-left' : 'bg-color-right';
  if (total === 3) return ['bg-color-left', 'bg-color-center', 'bg-color-right'][idx];
  if (total === 4) return ['bg-color-left', 'bg-color-center', 'bg-color-center', 'bg-color-right'][idx];
  return 'bg-color-extra'; 
};

  const form_name_list = getFormNameList(dataList);
  return (
    <>
    <button
      className="btn-back mb-3"
      onClick={() => setShowCompare(false)}
    >
      <ArrowLeft size={24} />
      </button>
      
    <section className="compare-forms-section mb-6">
       
<div className="product-header-list sticky-top bg-white z-3 py-2 border-bottom mb-4">
  {dataList.map((data, idx) => (
    <h2
      key={idx}
      className={`product-header-item text-center ${getHeaderColorClass(dataList.length, idx)}`}
    >
      {data.summary.item_name || data.summary.item_code}
    </h2>
  ))}
</div>

   {form_name_list.map((form_name, index) => (
  <CompareForm
            key={index}
            formName={form_name}
          dataList={dataList}
            language={language}
  />
))}

    </section>
    </>
  )
}
CompareForms.propTypes = {
  dataList: PropTypes.arrayOf(
    PropTypes.shape({
      forms: PropTypes.array.isRequired,
      summary: PropTypes.object.isRequired,
      data: PropTypes.array.isRequired,
    })
  ).isRequired,
  setShowCompare: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired,
};
  
export default CompareForms;
  