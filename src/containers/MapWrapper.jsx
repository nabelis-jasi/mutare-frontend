
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Map from './Map';
import MapControls from './MapControls';
import MapProgressBar from './MapProgressBar';

const MapWrapper = ({ manholes, pipelines, onFeatureClick }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setLoading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="map-wrapper">
      {loading && <MapProgressBar progress={progress} />}
      <Map manholes={manholes} pipelines={pipelines} onFeatureClick={onFeatureClick} />
      <MapControls
        onOverlayToggle={(type) => console.log('Toggle overlay', type)}
        onResetView={() => console.log('Reset view')}
      />
    </div>
  );
};

MapWrapper.propTypes = {
  manholes: PropTypes.array,
  pipelines: PropTypes.array,
  onFeatureClick: PropTypes.func,
};

export default MapWrapper;
