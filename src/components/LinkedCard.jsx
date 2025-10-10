
import PropTypes from 'prop-types';
import {getApiUrl} from '../utilities.jsx'

function LinkedCard( {loadNewElement, linked_batch, language} ) {

  const handleCardClick = () => {


    const api_url = getApiUrl(
      linked_batch.company_webservice,
      linked_batch.batch_code,
      linked_batch.item_code,
      linked_batch.productfamily_code,
      linked_batch.company_code,
      language);
      
    loadNewElement({ api_url:api_url, save_parent:true });
  };

  return (
    <div className="linked-card" role="button" onClick={handleCardClick} style={{ width: '10rem' }} >
      <div className="linked-card-body">
      
        <h5 className="linked-card-title">{linked_batch.item_name
          ? linked_batch.item_name
          : linked_batch.batch_code}
        </h5>
        <p className="linked-card-text">{linked_batch.company_shortname}</p>
        
      </div>
    </div>
  )
}
LinkedCard.propTypes = {
  loadNewElement: PropTypes.func.isRequired,
  linked_batch: PropTypes.shape({
    company_webservice: PropTypes.string.isRequired,
    batch_code: PropTypes.string.isRequired,
    item_name: PropTypes.string,
    company_shortname: PropTypes.string,
    item_code: PropTypes.string.isRequired,
    productfamily_code: PropTypes.string.isRequired,
    company_code: PropTypes.string.isRequired,
    batch_qty: PropTypes.number,
    batch_qty_unit_of_measure: PropTypes.string.isRequired,
  }),
  language: PropTypes.string.isRequired,
};


export default LinkedCard;

