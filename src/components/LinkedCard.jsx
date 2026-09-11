import PropTypes from 'prop-types';
import { getApiUrl } from '../utilities.jsx';

function LinkedCard({ loadNewElement, linked_batch, language }) {

  const handleClick = () => {
    const api_url = getApiUrl(
      linked_batch.company_webservice,
      linked_batch.batch_code,
      linked_batch.item_code,
      linked_batch.productfamily_code,
      linked_batch.company_code,
      language
    );
    loadNewElement({ api_url, save_parent: true, skip_compare: true });
  };

  const label = linked_batch.item_name || linked_batch.item_code || linked_batch.batch_code;

  return (
    <li className="linked-simple__item">
      <button className="linked-simple__btn" onClick={handleClick}>
        {label}
      </button>
    </li>
  );
}

LinkedCard.propTypes = {
  loadNewElement: PropTypes.func.isRequired,
  linked_batch: PropTypes.shape({
    company_webservice: PropTypes.string.isRequired,
    batch_code: PropTypes.string.isRequired,
    item_name: PropTypes.string,
    item_code: PropTypes.string.isRequired,
    productfamily_code: PropTypes.string.isRequired,
    company_code: PropTypes.string.isRequired,
  }),
  language: PropTypes.string.isRequired,
};

export default LinkedCard;
