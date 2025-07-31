import PropTypes from 'prop-types';
import translations from "./Translations.json";
import "../styles/OutputForm.css"
function OutputForm({ form, data_list, language}) {
 const orderedData = form.fields.map(field => 
    data_list.find(item => item.ID === field.ID))
    .filter(item => item != undefined);

  const value_class_name_list = orderedData.map(e =>
     e.language.toLowerCase() === language.toLowerCase() ? 'value py-2' : 'value py-2 ');

  const form_name_class = `mb-3 mt-4 text-start ${form.form_language.toLowerCase() === language.toLowerCase() ? '' : ''}`;



  return (
    <>
   
  <section className="output-form">
    
  <div className="output-row">
    <div className="output-title">
      <h2 className={form_name_class}>{form.form_name}</h2>
    </div>
    <div className="output-content">
      {orderedData.map((item, index) => (
        <div className="output-item" key={index}>
           <div className="label">
            {item.label}
          </div>
          <div className={value_class_name_list[index]}>
            
            {item.value_url 
              ? item.value_url_type === "image" 
                ? <img src={item.value_url} alt={item.label} className="img-fluid" /> 
                : <a href={item.value_url}>{item.value_text || translations[language].link_text}</a>
              : <span>{item.value_text}{item.value_number} {item.value_number_unit_of_measure}</span>
            }
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
</>
  )
}


OutputForm.propTypes = {
  form: PropTypes.object.isRequired,
  language: PropTypes.string.isRequired,
  data_list: PropTypes.array.isRequired,
  item_name: PropTypes.string.isRequired
};

export default OutputForm;