/**
 * 🚀 BUNDLE OPTIMIZATION: Image Optimization Component
 * Optimized image loading with lazy loading and WebP support
 */

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  fill = false,
  objectFit = 'cover',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // Generate WebP-compatible src if needed
  const optimizedSrc = src.includes('http') 
    ? `${src}?format=webp&quality=${quality}`
    : src;

  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400',
          className
        )}
        style={{ width, height }}
      >
        <span className="text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div 
          className="absolute inset-0 animate-pulse bg-gray-200"
          style={{ width, height }}
        />
      )}
      
      <Image
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          fill && `object-${objectFit}`
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  );
}

/**
 * Avatar component with optimized loading
 */
interface OptimizedAvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function OptimizedAvatar({
  src,
  name,
  size = 'md',
  className
}: OptimizedAvatarProps) {
  const sizeMap = {
    sm: { size: 32, text: 'text-xs' },
    md: { size: 40, text: 'text-sm' },
    lg: { size: 48, text: 'text-base' },
    xl: { size: 64, text: 'text-lg' }
  };

  const { size: dimensions, text } = sizeMap[size];
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div 
      className={cn(
        'relative flex items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 font-semibold text-white',
        text,
        className
      )}
      style={{ width: dimensions, height: dimensions }}
    >
      {src ? (
        <OptimizedImage
          src={src}
          alt={name}
          width={dimensions}
          height={dimensions}
          className="rounded-full"
          objectFit="cover"
          quality={90}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

/**
 * Lazy image gallery component
 */
interface LazyImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  className?: string;
}

export function LazyImageGallery({ images, className }: LazyImageGalleryProps) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set([...prev, index]));
  };

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4', className)}>
      {images.map((image, index) => (
        <div key={index} className="relative aspect-square">
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            fill
            objectFit="cover"
            priority={index < 4} // Prioritize first 4 images
            quality={index < 4 ? 90 : 75} // Higher quality for visible images
            className="rounded-lg"
            onLoad={() => handleImageLoad(index)}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />
          {image.caption && loadedImages.has(index) && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-sm p-2 rounded-b-lg">
              {image.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Performance monitoring for images
 */
export const imageOptimizationMetrics = {
  trackImageLoad: (src: string, loadTime: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'image_load_performance', {
        image_src: src,
        load_time: loadTime,
        timestamp: Date.now()
      });
    }
  },

  measureImageLoadTime: (src: string) => {
    const startTime = performance.now();
    return {
      complete: () => {
        const loadTime = performance.now() - startTime;
        imageOptimizationMetrics.trackImageLoad(src, Math.round(loadTime));
      }
    };
  }
};
