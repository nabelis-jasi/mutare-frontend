// src/components/shared/CellMedia.jsx
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Lightbox from 'react-images';
import MediaPopup from './MediaPopup'; // adjust path as needed
import PARAMETERS from '../../config/parameters';

const CellMedia = ({ content }) => {
  const [lightboxIsOpen, setLightboxIsOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [render, setRender] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Delay rendering to slow down API requests for media files
    const delay = Math.floor(Math.random() * 750) + 100;
    timeoutRef.current = setTimeout(() => {
      setRender(true);
      console.log(`%cRendering with delay of ${delay}ms`, 'color: blue; font-weight: bold;');
    }, delay);

    return () => clearTimeout(timeoutRef.current);
  }, []);

  const openLightbox = (event) => {
    event.preventDefault();
    setCurrentImage(0);
    setLightboxIsOpen(true);
  };

  const closeLightbox = () => {
    setLightboxIsOpen(false);
  };

  if (!render) return null;

  switch (content.inputType) {
    case PARAMETERS.INPUT_TYPES.EC5_AUDIO_TYPE:
      if (!content.answer) return null;
      return <MediaPopup type={PARAMETERS.INPUT_TYPES.EC5_AUDIO_TYPE} content={content} />;

    case PARAMETERS.INPUT_TYPES.EC5_PHOTO_TYPE:
      if (!content.answer) return null;
      return (
        <div className="thumb-wrapper">
          <a
            className="thumb"
            href={content.answer.entry_original}
            onClick={openLightbox}
          >
            <img
              className="animated fadeIn"
              key={content.entryUuid}
              src={content.answer.entry_thumb}
              alt="thumbnail"
              width="50"
              height="50"
            />
          </a>
          <Lightbox
            currentImage={currentImage}
            images={[{ src: content.answer.entry_original }]}
            isOpen={lightboxIsOpen}
            onClose={closeLightbox}
            showImageCount={false}
            backdropClosesModal
          />
        </div>
      );

    case PARAMETERS.INPUT_TYPES.EC5_VIDEO_TYPE:
      if (!content.answer) return null;
      return <MediaPopup type={PARAMETERS.INPUT_TYPES.EC5_VIDEO_TYPE} content={content} />;

    default:
      return <div>{content.answer?.entry_default}</div>;
  }
};

CellMedia.propTypes = {
  content: PropTypes.shape({
    inputType: PropTypes.string.isRequired,
    answer: PropTypes.any,
    entryUuid: PropTypes.string,
  }).isRequired,
};

export default CellMedia;
