import Svg, { Path } from 'react-native-svg';

import { C } from './theme';

/* Line icons (24px grid, 2px stroke) matching the website's set. */
const PATHS = {
  phone:
    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z',
  pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M9 10a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z M12 9v4M12 17h.01',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  arrowRight: 'M5 12h14M13 5l7 7-7 7',
  arrowLeft: 'M19 12H5M11 5l-7 7 7 7',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  qr: 'M4 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M15 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M4 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z M14 14h3v3h-3z M20 14v.01 M14 20h3 M20 17.5V20h-2.5',
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  user: 'M20 21a8 8 0 0 0-16 0 M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  tag: 'M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0l-7.18-7.18a2 2 0 0 1 0-2.83l7.18-7.17a2 2 0 0 1 1.41-.59H19a2 2 0 0 1 2 2v6.17a2 2 0 0 1-.41 1.41Z M15 7.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
  car: 'M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11 M3 11h18v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z M7 14h.01 M17 14h.01',
  bag: 'M6 8h12l1 12H5L6 8z M9 8V6a3 3 0 0 1 6 0v2',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 7l-10 5L2 7',
  flash: 'M13 2 4 14h7l-1 8 9-12h-7l1-8z',
  edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7 M16 6l-4-4-4 4 M12 2v13',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  keyboard:
    'M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z M6 10h.01 M10 10h.01 M14 10h.01 M18 10h.01 M7 14h10',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z M8 11V7a4 4 0 0 1 8 0v4',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M12 7v5l3 2',
  copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  eye: 'M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12Z M8.8 12a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0',
  plus: 'M12 5v14M5 12h14',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  shieldCheck: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  key: 'M15 7a4 4 0 1 1-3.9 5H8v3H5v3H2v-3l7.1-7.1A4 4 0 0 1 15 7z M16 8h.01',
  settings:
    'M4 6h10 M18 6h2 M4 12h4 M12 12h8 M4 18h12 M14 6a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M8 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M16 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  send: 'M22 2 11 13 M22 2l-7 20-4-9-9-4 20-7z',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M12 11v5 M12 8h.01',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 18,
  color = C.text,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return <PathIcon d={PATHS[name]} size={size} color={color} strokeWidth={strokeWidth} />;
}

/** Same rendering for an arbitrary path (the scan-reason glyphs). */
export function PathIcon({
  d,
  size = 18,
  color = C.text,
  strokeWidth = 2,
}: {
  d: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** The SecureTag shield. `mono` draws it in one colour (for dark backgrounds). */
export function ShieldMark({ size = 40, mono }: { size?: number; mono?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 144 144" accessibilityLabel="SecureTag">
      <Path
        d="M118.56,13.96L72.36.09c-.21-.06-.43-.06-.64-.09v17.38c3.99.15,7.18,3.41,7.18,7.43s-3.19,7.28-7.18,7.43v111.61c.39-.05.79-.14,1.16-.31.59-.27,14.68-6.62,28.99-16.98,8.52-6.17,15.34-12.48,20.26-18.77,6.45-8.23,9.72-16.51,9.72-24.59V31.81c0-8.23-5.4-15.49-13.29-17.86Z"
        fill={mono ?? '#6366f1'}
        opacity={mono ? 0.78 : 1}
      />
      <Path
        d="M64.54,24.82c0-4.02,3.19-7.28,7.18-7.43V0c-.21.03-.43.03-.64.09L24.87,13.96c-7.89,2.37-13.29,9.62-13.29,17.86v51.4c0,8.08,3.27,16.35,9.72,24.59,4.93,6.29,11.75,12.6,20.26,18.77,14.31,10.36,28.4,16.71,28.99,16.98.37.17.76.26,1.16.31V32.25c-3.98-.15-7.18-3.41-7.18-7.43Z"
        fill={mono ?? '#4e46dc'}
      />
    </Svg>
  );
}
