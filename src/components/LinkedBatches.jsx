import PropTypes from 'prop-types';
import LinkedCard from './LinkedCard';
import translations from "./Translations.json";

function LinkedBatches( {loadNewElement, linked_batches, language} ) {

  return (
    <section className="linked-batches">
      <h2 className="linked-batches-title">{translations[language].traceability_text}</h2>
    
      <div className="linked-batches-list">
        {
          linked_batches.map((linked_batch, index) => (
            <LinkedCard loadNewElement={loadNewElement} linked_batch={linked_batch} language={language} key={index}/>
          ))
        }
      </div>
    </section>

  )
}
LinkedBatches.propTypes = {
  loadNewElement: PropTypes.func.isRequired,
  linked_batches: PropTypes.array.isRequired,
  language: PropTypes.string.isRequired,
};


export default LinkedBatches;
