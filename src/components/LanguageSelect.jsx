import Select from "react-select/base";

import  { useState} from 'react';
import '../styles/LanguageSelect.css'
import PropTypes from "prop-types";

const options = [
  {value: 'IT', label: 'Italiano'},
  {value: 'EN', label: 'English'},
  {value: 'ES', label:'Espanol'},
  {value: 'FR', label: 'Francais'},
];
function LanguageSelect({ setLanguage }) {
  const [selectedOption, setSelectedOption] = useState(options[0]);
  const [showSelect, setShowSelect] = useState(false);
  const handleChange = (selected) => {
    setSelectedOption(selected);
    setLanguage(selected.value);
        setShowSelect(false); 

  };
  return (
    <div className="language-select-wrapper"
    onMouseEnter={() => setShowSelect(true)}
   
    >

  {!showSelect && (
      <div className="selected-language">{selectedOption.label}</div>
    )}    
      {showSelect && (
        <Select
            className="language-select"
            value={selectedOption}
            onChange={handleChange}
            options={options}
            menuIsOpen
             onInputChange={() => {}} 
            isSearchable={false}
            components={{ IndicatorSeparator: () => null }}
            />
          )}
    </div>
  )
}
LanguageSelect.propTypes = {
  setLanguage : PropTypes.func.isRequired
};
export default LanguageSelect;