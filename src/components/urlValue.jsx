import PropTypes from 'prop-types';
import { Video as VideoIcon, Link as LinkIcon } from 'lucide-react';
import { FaFilePdf, FaFileAlt } from 'react-icons/fa';
import { getDirectImageUrl, getYouTubeId } from '../utilities.jsx';

/* Badge tondo con la sola icona, condiviso da PDF/DOC/VIDEO(fallback)/website-other,
   usato sia da OutputForm (prodotto singolo) sia da CompareForms (confronto): stesso
   aspetto in entrambe le viste. Nome/tipo di link restano disponibili come tooltip
   nativo (title) e per screen reader (aria-label + testo visually-hidden). */
function IconLinkBadge({ url, icon: Icon, label, variant, ariaLabel }) {
  return (
    <a
      href={url} target="_blank" rel="noopener noreferrer"
      className={`file-link file-link--${variant}`}
      aria-label={ariaLabel} title={ariaLabel}
    >
      <Icon className="file-link__icon" />
      <span className="visually-hidden">{label}</span>
    </a>
  );
}
IconLinkBadge.propTypes = {
  url: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  variant: PropTypes.string.isRequired,
  ariaLabel: PropTypes.string.isRequired,
};

/**
 * Rendering condiviso di una proprietà di tipo URL (immagine/video/PDF/doc/website/other),
 * usato sia da OutputForm (prodotto singolo) sia da CompareForms (confronto, con compact=true).
 */
export function UrlValue({ item, compact = false }) {
  const urlType = item.value_url_type?.toUpperCase();
  const url = item.value_url;

  if (urlType === "IMAGE") {
    return (
      <img
        src={getDirectImageUrl(url)}
        alt={item.label ?? "image"}
        className={compact ? "img-fluid cmp-img-thumb" : "img-fluid"}
      />
    );
  }

  if (urlType === "VIDEO") {
    // Nel confronto (compact) l'anteprima piena è troppo pesante con più colonne
    // affiancate: mostriamo sempre l'icona, anche per YouTube. Nel prodotto singolo
    // manteniamo l'anteprima embed per YouTube; per gli altri (Vimeo, mp4 diretti
    // non riconosciuti) mostriamo l'icona invece di un player che non funzionerebbe.
    const ytId = !compact ? getYouTubeId(url) : null;
    if (ytId) {
      return (
        <div className="video-preview">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title={item.label ?? "video"}
            allowFullScreen
            className="video-iframe"
          />
        </div>
      );
    }
    return (
      <IconLinkBadge url={url} icon={VideoIcon} label="VIDEO" variant="video" ariaLabel="Apri video" />
    );
  }

  if (urlType === "P" || urlType === "PDF") {
    return (
      <IconLinkBadge url={url} icon={FaFilePdf} label="PDF" variant="pdf" ariaLabel="Apri PDF" />
    );
  }

  if (urlType === "DOC" || urlType === "DOCUMENT") {
    return (
      <IconLinkBadge url={url} icon={FaFileAlt} label="LINK" variant="doc" ariaLabel="Apri documento" />
    );
  }

  return (
    <IconLinkBadge url={url} icon={LinkIcon} label="LINK" variant="link" ariaLabel="Apri link" />
  );
}

UrlValue.propTypes = {
  item: PropTypes.shape({
    value_url: PropTypes.string,
    value_url_type: PropTypes.string,
    label: PropTypes.string,
  }).isRequired,
  compact: PropTypes.bool,
};

export default UrlValue;
