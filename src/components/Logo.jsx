import React from 'react';
import splashImage from '../assets/Untitled design_20260319_161147_0000.png';

export default function Logo({ size = 'medium' }) {
  const sizes = {
    small: { width: '40px', height: '40px' },
    medium: { width: '80px', height: '80px' },
    large: { width: '120px', height: '120px' }
  };

  return (
    <img 
      src={splashImage}
      alt="Logo"
      style={{
        ...sizes[size],
        objectFit: 'contain'
      }}
    />
  );
}