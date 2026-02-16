'use client';

import Image from 'next/image';
import { ReactNode } from 'react';

interface ImageWithWatermarkProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  children?: ReactNode;
  showCenterWatermark?: boolean;
  showCornerWatermark?: boolean;
}

export default function ImageWithWatermark({
  src,
  alt,
  fill = false,
  width,
  height,
  className = '',
  priority = false,
  sizes,
  children,
  showCenterWatermark = true,
  showCornerWatermark = true,
}: ImageWithWatermarkProps) {
  // When using fill, return elements that will be placed inside a relative container
  if (fill) {
    return (
      <>
        <Image
          src={src}
          alt={alt}
          fill
          className={className}
          priority={priority}
          sizes={sizes}
        />
        {/* Center Watermark */}
        {showCenterWatermark && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none" 
            style={{ zIndex: 20 }}
          >
            <img
              src="/logo-bhd.png"
              alt="BHD Logo Watermark"
              className="logo-golden-filter"
              style={{ 
                width: '280px',
                height: '280px',
                opacity: 0.6,
                objectFit: 'contain',
                pointerEvents: 'none',
                display: 'block'
              }}
            />
          </div>
        )}
        {/* Corner Watermark - Right Top */}
        {showCornerWatermark && (
          <div 
            className="absolute right-4 top-4 pointer-events-none" 
            style={{ zIndex: 20 }}
          >
            <img
              src="/logo-bhd.png"
              alt="BHD Logo"
              className="logo-golden-filter"
              style={{ 
                width: '120px',
                height: '120px',
                opacity: 1,
                objectFit: 'contain',
                pointerEvents: 'none',
                display: 'block'
              }}
            />
          </div>
        )}
        {children}
      </>
    );
  }

  // When not using fill, wrap in a relative container
  return (
    <div className="relative">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={priority}
      />
      {/* Center Watermark */}
      {showCenterWatermark && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none" 
          style={{ zIndex: 20 }}
        >
          <img
            src="/logo-bhd.png"
            alt="BHD Logo Watermark"
            className="logo-golden-filter"
            style={{ 
              width: '280px',
              height: '280px',
              opacity: 0.6,
              objectFit: 'contain',
              pointerEvents: 'none',
              display: 'block'
            }}
          />
        </div>
      )}
      {/* Corner Watermark - Right Top */}
      {showCornerWatermark && (
        <div 
          className="absolute right-4 top-4 pointer-events-none" 
          style={{ zIndex: 20 }}
        >
          <img
            src="/logo-bhd.png"
            alt="BHD Logo"
            className="logo-golden-filter"
            style={{ 
              width: '120px',
              height: '120px',
              opacity: 1,
              objectFit: 'contain',
              pointerEvents: 'none',
              display: 'block'
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
}
