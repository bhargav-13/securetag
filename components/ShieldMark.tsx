/** The SecureTag shield glyph (inline SVG, inherits size from parent). */
export default function ShieldMark({
  className,
  style,
  title = "SecureTag",
}: {
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 144 144"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <path
        d="M118.56,13.96L72.36.09c-.21-.06-.43-.06-.64-.09v17.38c3.99.15,7.18,3.41,7.18,7.43s-3.19,7.28-7.18,7.43v111.61c.39-.05.79-.14,1.16-.31.59-.27,14.68-6.62,28.99-16.98,8.52-6.17,15.34-12.48,20.26-18.77,6.45-8.23,9.72-16.51,9.72-24.59V31.81c0-8.23-5.4-15.49-13.29-17.86Z"
        fill="#6366f1"
      />
      <path
        d="M64.54,24.82c0-4.02,3.19-7.28,7.18-7.43V0c-.21.03-.43.03-.64.09L24.87,13.96c-7.89,2.37-13.29,9.62-13.29,17.86v51.4c0,8.08,3.27,16.35,9.72,24.59,4.93,6.29,11.75,12.6,20.26,18.77,14.31,10.36,28.4,16.71,28.99,16.98.37.17.76.26,1.16.31V32.25c-3.98-.15-7.18-3.41-7.18-7.43Z"
        fill="#4e46dc"
      />
    </svg>
  );
}
