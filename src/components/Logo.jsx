import React from 'react';
import splashImage from '../assets/logo.png';

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