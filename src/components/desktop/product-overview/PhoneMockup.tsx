import Image from 'next/image';
import type { ProductMediaItem } from './mediaManifest';

interface PhoneMockupProps {
  media: ProductMediaItem;
  priority?: boolean;
  showCaption?: boolean;
  caption?: string;
  captionClassName?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
}

export function PhoneMockup({
  media,
  priority = false,
  showCaption = false,
  caption,
  captionClassName = 'text-ink-3',
  className = '',
  imageClassName = '',
  sizes = '(max-width: 640px) 220px, (max-width: 1024px) 260px, 280px',
}: PhoneMockupProps) {
  const displayCaption = caption ?? media.caption;

  return (
    <figure className={`group flex flex-col items-center bg-transparent ${className}`}>
      <div className="relative w-full bg-transparent transition-transform duration-[220ms] ease-[var(--ease)] group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <Image
          src={media.src}
          alt={media.alt}
          width={media.width}
          height={media.height}
          priority={priority}
          sizes={sizes}
          className={`h-auto w-full select-none bg-transparent object-contain drop-shadow-[0_24px_48px_rgba(3,25,91,0.28)] dark:drop-shadow-[0_28px_56px_rgba(0,0,0,0.65)] ${imageClassName}`}
        />
      </div>
      {showCaption && displayCaption ? (
        <figcaption className={`mt-3 text-center text-[12px] leading-[16px] ${captionClassName}`}>
          {displayCaption}
        </figcaption>
      ) : null}
    </figure>
  );
}
