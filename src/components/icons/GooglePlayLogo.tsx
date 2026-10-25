import React from 'react';

interface GooglePlayLogoProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export default function GooglePlayLogo({
  size = 20,
  width,
  height,
  className,
}: GooglePlayLogoProps) {
  const w = width ?? size;
  const h = height ?? size;
  return (
    <svg
      viewBox="0 0 24 24"
      width={w}
      height={h}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path fill="#00D7FE" d="M3.6 1.8c-.3.3-.4.8-.4 1.4v17.6c0 .6.2 1.1.4 1.4l.1.1 9.9-9.9v-.2L3.7 1.7l-.1.1z" />
      <path fill="#FFCE00" d="M16.9 15.7l-3.3-3.3v-.2l3.3-3.3.1.1 3.9 2.2c1.1.6 1.1 1.7 0 2.3l-3.9 2.2h-.1z" />
      <path fill="#FF3A44" d="M17 15.6l-3.4-3.4-9.9 9.9c.4.4 1 .4 1.7.1L17 15.6" />
      <path fill="#00F076" d="M17 8.8L5.4 2.2c-.7-.4-1.3-.3-1.7.1l9.9 9.9L17 8.8z" />
    </svg>
  );
}
