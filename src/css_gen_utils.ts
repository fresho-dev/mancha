const MEDIA_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};
const REM_UNIT = 0.25;
const UNITS_SM = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const UNITS_LG = [16, 20, 24, 25, 28, 30, 32, 36, 40, 44, 48, 50, 52, 56, 60];
const UNITS_XL = [
  64, 72, 80, 96, 100, 112, 128, 144, 160, 192, 200, 224, 256, 288, 300, 320, 384, 400, 448, 500,
  512,
];
const UNITS_ALL = [...UNITS_SM, ...UNITS_LG, ...UNITS_XL, ...Object.values(MEDIA_BREAKPOINTS)];
const PERCENTS = [1, 2, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 98, 99, 100];
const DURATIONS = [75, 100, 150, 200, 300, 500, 700, 1000];
const PSEUDO_STATES = ["hover", "focus", "disabled", "active"];
const PROPS_SPACING = {
  margin: "m",
  padding: "p",
};
const PROPS_SIZING = {
  width: "w",
  height: "h",
};
const PROPS_POSITION = {
  top: "top",
  right: "right",
  bottom: "bottom",
  left: "left",
};
const PROPS_SIZING_MINMAX = {
  "min-width": "min-w",
  "min-height": "min-h",
  "max-width": "max-w",
  "max-height": "max-h",
};
const PROPS_CUSTOM = {
  // Based on https://tailwindcss.com.
  // Font family.
  "font-mono": { "font-family": "monospace" },
  "font-sans": { "font-family": "sans-serif" },
  "font-serif": { "font-family": "serif" },
  "font-cursive": { "font-family": "cursive" },
  // Font size.
  "text-xs": { "font-size": ".75rem", "line-height": "calc(1 / 0.75)" },
  "text-sm": { "font-size": ".875rem", "line-height": "calc(1.25 / 0.875)" },
  "text-base": { "font-size": "1rem", "line-height": "calc(1.5 / 1)" },
  "text-lg": { "font-size": "1.125rem", "line-height": "calc(1.75 / 1.125)" },
  "text-xl": { "font-size": "1.25rem", "line-height": "calc(1.75 / 1.25)" },
  "text-2xl": { "font-size": "1.5rem", "line-height": "calc(2 / 1.5)" },
  "text-3xl": { "font-size": "1.875rem", "line-height": "calc(2.25 / 1.875)" },
  "text-4xl": { "font-size": "2.25rem", "line-height": "calc(2.5 / 2.25)" },
  "text-5xl": { "font-size": "3rem", "line-height": "1" },
  "text-6xl": { "font-size": "3.75rem", "line-height": "1" },
  "text-7xl": { "font-size": "4.5rem", "line-height": "1" },
  // Font weight.
  "font-thin": { "font-weight": 100 },
  "font-extralight": { "font-weight": 200 },
  "font-light": { "font-weight": 300 },
  "font-normal": { "font-weight": 400 },
  "font-medium": { "font-weight": 500 },
  "font-semibold": { "font-weight": 600 },
  "font-bold": { "font-weight": 700 },
  "font-extrabold": { "font-weight": 800 },
  "font-black": { "font-weight": 900 },
  // Font style.
  italic: { "font-style": "italic" },
  "not-italic": { "font-style": "normal" },
  // Sizing.
  "w-max": { width: "max-content" },
  "w-min": { width: "min-content" },
  "w-fit": { width: "fit-content" },
  "h-max": { height: "max-content" },
  "h-min": { height: "min-content" },
  "h-fit": { height: "fit-content" },
  // Letter spacing.
  "tracking-tighter": { "letter-spacing": "-0.05em" },
  "tracking-tight": { "letter-spacing": "-0.025em" },
  "tracking-normal": { "letter-spacing": "0" },
  "tracking-wide": { "letter-spacing": "0.025em" },
  "tracking-wider": { "letter-spacing": "0.05em" },
  "tracking-widest": { "letter-spacing": "0.1em" },
  // Line height.
  "leading-none": { "line-height": "1" },
  "leading-tight": { "line-height": "1.25" },
  "leading-snug": { "line-height": "1.375" },
  "leading-normal": { "line-height": "1.5" },
  "leading-relaxed": { "line-height": "1.625" },
  "leading-loose": { "line-height": "2" },
  // Text align.
  "text-left": { "text-align": "left" },
  "text-right": { "text-align": "right" },
  "text-center": { "text-align": "center" },
  "text-justify": { "text-align": "justify" },
  // Text decoration.
  underline: { "text-decoration": "underline" },
  "no-underline": { "text-decoration": "none" },
  "decoration-none": { "text-decoration": "none" },
  "line-through": { "text-decoration": "line-through" },
  // Text transform.
  uppercase: { "text-transform": "uppercase" },
  lowercase: { "text-transform": "lowercase" },
  capitalize: { "text-transform": "capitalize" },
  // Text overflow.
  truncate: { "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" },
  "text-elipsis": { "text-overflow": "ellipsis" },
  "text-clip": { "text-overflow": "clip" },
  // Text wrap.
  "text-wrap": { "text-wrap": "wrap" },
  "text-nowrap": { "text-wrap": "nowrap" },
  "text-balance": { "text-wrap": "balance" },
  "text-pretty": { "text-wrap": "pretty" },
  // Whitespace.
  "whitespace-normal": { "white-space": "normal" },
  "whitespace-nowrap": { "white-space": "nowrap" },
  "whitespace-pre": { "white-space": "pre" },
  "whitespace-pre-line": { "white-space": "pre-line" },
  "whitespace-pre-wrap": { "white-space": "pre-wrap" },
  "whitespace-break-spaces": { "white-space": "break-spaces" },
  // Position.
  relative: { position: "relative" },
  fixed: { position: "fixed" },
  absolute: { position: "absolute" },
  sticky: { position: "sticky" },
  // Object fit.
  "object-contain": { "object-fit": "contain" },
  "object-cover": { "object-fit": "cover" },
  "object-fill": { "object-fit": "fill" },
  "object-none": { "object-fit": "none" },
  // Display.
  block: { display: "block" },
  contents: { display: "contents" },
  hidden: { display: "none" },
  inline: { display: "inline" },
  "inline-block": { display: "inline-block" },
  // Visibility.
  visible: { visibility: "visible" },
  invisible: { visibility: "hidden" },
  collapse: { visibility: "collapse" },
  // List style type.
  "list-none": { "list-style-type": "none" },
  "list-disc": { "list-style-type": "disc" },
  "list-decimal": { "list-style-type": "decimal" },
  // Flex.
  flex: { display: "flex" },
  "flex-1": { flex: "1 1 0%" },
  "flex-inline": { display: "inline-flex" },
  "flex-row": { "flex-direction": "row" },
  "flex-col": { "flex-direction": "column" },
  "flex-row-reverse": { "flex-direction": "row-reverse" },
  "flex-col-reverse": { "flex-direction": "column-reverse" },
  "flex-wrap": { "flex-wrap": "wrap" },
  "flex-wrap-reverse": { "flex-wrap": "wrap-reverse" },
  "flex-nowrap": { "flex-wrap": "nowrap" },
  "justify-start": { "justify-content": "flex-start" },
  "justify-end": { "justify-content": "flex-end" },
  "justify-center": { "justify-content": "center" },
  "justify-between": { "justify-content": "space-between" },
  "justify-around": { "justify-content": "space-around" },
  "justify-evenly": { "justify-content": "space-evenly" },
  "justify-stretch": { "justify-content": "stretch" },
  "items-start": { "align-items": "flex-start" },
  "items-end": { "align-items": "flex-end" },
  "items-center": { "align-items": "center" },
  "items-stretch": { "align-items": "stretch" },
  "flex-grow": { "flex-grow": 1 },
  "flex-shrink": { "flex-shrink": 1 },
  // Vertical alignment.
  "align-baseline": { "vertical-align": "baseline" },
  "align-top": { "vertical-align": "top" },
  "align-middle": { "vertical-align": "middle" },
  "align-bottom": { "vertical-align": "bottom" },
  "align-text-top": { "vertical-align": "text-top" },
  "align-text-bottom": { "vertical-align": "text-bottom" },
  // Overflow.
  "overflow-auto": { overflow: "auto" },
  "overflow-x-auto": { "overflow-x": "auto" },
  "overflow-y-auto": { "overflow-y": "auto" },
  "overflow-hidden": { overflow: "hidden" },
  "overflow-x-hidden": { "overflow-x": "hidden" },
  "overflow-y-hidden": { "overflow-y": "hidden" },
  "overflow-visible": { overflow: "visible" },
  // Overscroll.
  "overscroll-auto": { "overscroll-behavior": "auto" },
  "overscroll-contain": { "overscroll-behavior": "contain" },
  "overscroll-none": { "overscroll-behavior": "none" },
  "overscroll-x-auto": { "overscroll-behavior-x": "auto" },
  "overscroll-x-contain": { "overscroll-behavior-x": "contain" },
  "overscroll-x-none": { "overscroll-behavior-x": "none" },
  "overscroll-y-auto": { "overscroll-behavior-y": "auto" },
  "overscroll-y-contain": { "overscroll-behavior-y": "contain" },
  "overscroll-y-none": { "overscroll-behavior-y": "none" },
  // Z-index.
  "z-auto": { "z-index": "auto" },
  // Cursors.
  "cursor-pointer": { cursor: "pointer" },
  "cursor-wait": { cursor: "wait" },
  "cursor-not-allowed": { cursor: "not-allowed" },
  // User selection.
  "select-none": { "user-select": "none" },
  "select-all": { "user-select": "all" },
  // Events.
  "pointer-events-auto": { "pointer-events": "auto" },
  "pointer-events-none": { "pointer-events": "none" },
  // Sizing.
  "box-border": { "box-sizing": "border-box" },
  "box-content": { "box-sizing": "content-box" },
  // Resizing.
  resize: { resize: "both" },
  "resize-x": { resize: "horizontal" },
  "resize-y": { resize: "vertical" },
  "resize-none": { resize: "none" },
  // Borders.
  border: { border: "1px solid" },
  "border-none": { border: "none" },
  "border-solid": { "border-style": "solid" },
  "border-dashed": { "border-style": "dashed" },
  "border-dotted": { "border-style": "dotted" },
  "border-collapse": { "border-collapse": "collapse" },
  // Radius.
  "rounded-none": { "border-radius": "0" },
  rounded: { "border-radius": ".25rem" },
  "rounded-sm": { "border-radius": ".125rem" },
  "rounded-md": { "border-radius": ".375rem" },
  "rounded-lg": { "border-radius": ".5rem" },
  "rounded-xl": { "border-radius": ".75rem" },
  "rounded-full": { "border-radius": "9999px" },
  // Shadows.
  shadow: { "box-shadow": "0 0 1px 0 rgba(0, 0, 0, 0.05)" },
  "shadow-sm": { "box-shadow": "0 1px 2px 0 rgba(0, 0, 0, 0.05)" },
  "shadow-md": {
    "box-shadow": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  },
  "shadow-lg": {
    "box-shadow": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  },
  "shadow-xl": {
    "box-shadow": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
  "shadow-2xl": { "box-shadow": "0 25px 50px -12px rgba(0, 0, 0, 0.25)" },
  "shadow-inner": { "box-shadow": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)" },
  "shadow-outline": { "box-shadow": "0 0 0 3px rgba(66, 153, 225, 0.5)" },
  "shadow-none": { "box-shadow": "none" },
  // Transitions.
  "transition-none": { transition: "none" },
  transition: { transition: `all 150ms ease-in-out` },
  // Animations.
  "animate-none": { animation: "none" },
  "animate-spin": { animation: "spin 1s linear infinite" },
  "animate-ping": { animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" },
  "animate-pulse": { animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" },
};
const PROPS_AS_IS = [
  `@keyframes spin {
    from { transform: rotate(0deg) }
    to { transform: rotate(360deg) }
  }`,
  `@keyframes ping {
    75%, 100% {
      transform: scale(2);
      opacity: 0;
    }
  }`,
  `@keyframes pulse {
    0%, 100% { opacity: 1 }
    50% { opacity: .5 }
  }`,
];

const PROPS_COLORS = {
  red: {
    50: 0xffebee,
    100: 0xffcdd2,
    200: 0xef9a9a,
    300: 0xe57373,
    400: 0xef5350,
    500: 0xf44336,
    600: 0xe53935,
    700: 0xd32f2f,
    800: 0xc62828,
    900: 0xb71c1c,
  },
  pink: {
    50: 0xfce4ec,
    100: 0xf8bbd0,
    200: 0xf48fb1,
    300: 0xf06292,
    400: 0xec407a,
    500: 0xe91e63,
    600: 0xd81b60,
    700: 0xc2185b,
    800: 0xad1457,
    900: 0x880e4f,
  },
  purple: {
    50: 0xf3e5f5,
    100: 0xe1bee7,
    200: 0xce93d8,
    300: 0xba68c8,
    400: 0xab47bc,
    500: 0x9c27b0,
    600: 0x8e24aa,
    700: 0x7b1fa2,
    800: 0x6a1b9a,
    900: 0x4a148c,
  },
  "deep-purple": {
    50: 0xede7f6,
    100: 0xd1c4e9,
    200: 0xb39ddb,
    300: 0x9575cd,
    400: 0x7e57c2,
    500: 0x673ab7,
    600: 0x5e35b1,
    700: 0x512da8,
    800: 0x4527a0,
    900: 0x311b92,
  },

  indigo: {
    50: 0xe8eaf6,
    100: 0xc5cae9,
    200: 0x9fa8da,
    300: 0x7986cb,
    400: 0x5c6bc0,
    500: 0x3f51b5,
    600: 0x3949ab,
    700: 0x303f9f,
    800: 0x283593,
    900: 0x1a237e,
  },
  blue: {
    50: 0xe3f2fd,
    100: 0xbbdefb,
    200: 0x90caf9,
    300: 0x64b5f6,
    400: 0x42a5f5,
    500: 0x2196f3,
    600: 0x1e88e5,
    700: 0x1976d2,
    800: 0x1565c0,
    900: 0x0d47a1,
  },
  "light-blue": {
    50: 0xe1f5fe,
    100: 0xb3e5fc,
    200: 0x81d4fa,
    300: 0x4fc3f7,
    400: 0x29b6f6,
    500: 0x03a9f4,
    600: 0x039be5,
    700: 0x0288d1,
    800: 0x0277bd,
    900: 0x01579b,
  },
  cyan: {
    50: 0xe0f7fa,
    100: 0xb2ebf2,
    200: 0x80deea,
    300: 0x4dd0e1,
    400: 0x26c6da,
    500: 0x00bcd4,
    600: 0x00acc1,
    700: 0x0097a7,
    800: 0x00838f,
    900: 0x006064,
  },
  teal: {
    50: 0xe0f2f1,
    100: 0xb2dfdb,
    200: 0x80cbc4,
    300: 0x4db6ac,
    400: 0x26a69a,
    500: 0x009688,
    600: 0x00897b,
    700: 0x00796b,
    800: 0x00695c,
    900: 0x004d40,
  },
  green: {
    50: 0xe8f5e9,
    100: 0xc8e6c9,
    200: 0xa5d6a7,
    300: 0x81c784,
    400: 0x66bb6a,
    500: 0x4caf50,
    600: 0x43a047,
    700: 0x388e3c,
    800: 0x2e7d32,
    900: 0x1b5e20,
  },
  "light-green": {
    50: 0xf1f8e9,
    100: 0xdcedc8,
    200: 0xc5e1a5,
    300: 0xaed581,
    400: 0x9ccc65,
    500: 0x8bc34a,
    600: 0x7cb342,
    700: 0x689f38,
    800: 0x558b2f,
    900: 0x33691e,
  },
  lime: {
    50: 0xf9fbe7,
    100: 0xf0f4c3,
    200: 0xe6ee9c,
    300: 0xdce775,
    400: 0xd4e157,
    500: 0xcddc39,
    600: 0xc0ca33,
    700: 0xafb42b,
    800: 0x9e9d24,
    900: 0x827717,
  },
  yellow: {
    50: 0xfffde7,
    100: 0xfff9c4,
    200: 0xfff59d,
    300: 0xfff176,
    400: 0xffee58,
    500: 0xffeb3b,
    600: 0xfdd835,
    700: 0xfbc02d,
    800: 0xf9a825,
    900: 0xf57f17,
  },
  amber: {
    50: 0xfff8e1,
    100: 0xffecb3,
    200: 0xffe082,
    300: 0xffd54f,
    400: 0xffca28,
    500: 0xffc107,
    600: 0xffb300,
    700: 0xffa000,
    800: 0xff8f00,
    900: 0xff6f00,
  },
  orange: {
    50: 0xfff3e0,
    100: 0xffe0b2,
    200: 0xffcc80,
    300: 0xffb74d,
    400: 0xffa726,
    500: 0xff9800,
    600: 0xfb8c00,
    700: 0xf57c00,
    800: 0xef6c00,
    900: 0xe65100,
  },
  "deep-orange": {
    50: 0xfbe9e7,
    100: 0xffccbc,
    200: 0xffab91,
    300: 0xff8a65,
    400: 0xff7043,
    500: 0xff5722,
    600: 0xf4511e,
    700: 0xe64a19,
    800: 0xd84315,
    900: 0xbf360c,
  },
  brown: {
    50: 0xefebe9,
    100: 0xd7ccc8,
    200: 0xbcaaa4,
    300: 0xa1887f,
    400: 0x8d6e63,
    500: 0x795548,
    600: 0x6d4c41,
    700: 0x5d4037,
    800: 0x4e342e,
    900: 0x3e2723,
  },
  gray: {
    50: 0xfafafa,
    100: 0xf5f5f5,
    200: 0xeeeeee,
    300: 0xe0e0e0,
    400: 0xbdbdbd,
    500: 0x9e9e9e,
    600: 0x757575,
    700: 0x616161,
    800: 0x424242,
    900: 0x212121,
  },
  "blue-gray": {
    50: 0xeceff1,
    100: 0xcfd8dc,
    200: 0xb0bec5,
    300: 0x90a4ae,
    400: 0x78909c,
    500: 0x607d8b,
    600: 0x546e7a,
    700: 0x455a64,
    800: 0x37474f,
    900: 0x263238,
  },
};

function hexColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function wrapPseudoStates(klass: string): string[] {
  return PSEUDO_STATES.map((state) => `.${state}\\:${klass}:${state}`);
}

function wrapMediaQueries(klass: string, rule: string): string[] {
  return Object.entries(MEDIA_BREAKPOINTS).map(
    ([bp, width]) => `@media (min-width: ${width}px) { .${bp}\\:${klass} { ${rule} } }`
  );
}

function ruleSorter(a: string, b: string): number {
  // If one rule is a media query, it goes after the base rules.
  if (a.includes("@media") && !b.includes("@media")) {
    return 1;
  } else if (!a.includes("@media") && b.includes("@media")) {
    return -1;
  }

  // Otherwise, fall back to a lexicographical sort.
  return a.localeCompare(b);
}

function posneg(props: { [key: string]: string }): string[] {
  return Object.entries(props)
    .flatMap(([prop, klass]) => [
      // Zero.
      [`${klass}-0`, `${prop}: 0`],
      // Screen.
      [`${klass}-screen`, `${prop}: 100v${prop.includes('height') ? 'h' : 'w'}`],
      // Full.
      [`${klass}-full`, `${prop}: 100%`],
      // Positive REM units.
      ...UNITS_ALL.map((v) => [`${klass}-${v}`, `${prop}: ${v * REM_UNIT}rem`]),
      // Negative REM units.
      ...UNITS_ALL.map((v) => [`-${klass}-${v}`, `${prop}: -${v * REM_UNIT}rem`]),
      // Positive PX units.
      ...UNITS_ALL.map((v) => [`${klass}-${v}px`, `${prop}: ${v}px`]),
      // Negative PX units.
      ...UNITS_ALL.map((v) => [`-${klass}-${v}px`, `${prop}: -${v}px`]),
      // Positive percent units.
      ...PERCENTS.map((v) => [`${klass}-${v}\\%`, `${prop}: ${v}%`]),
      // Negative percent units.
      ...PERCENTS.map((v) => [`-${klass}-${v}\\%`, `${prop}: -${v}%`]),
    ])
    .flatMap(([klass, rule]) => [
      `.${klass} { ${rule} }`,
      `${wrapPseudoStates(klass).join(",")} { ${rule} }`,
      ...wrapMediaQueries(klass, rule),
    ]);
}

function autoxy(props: { [key: string]: string }): string[] {
  return Object.entries(props)
    .flatMap(([prop, klass]) => [
      // Auto.
      [`${klass}-auto`, `${prop}: auto`],
      // Auto x-axis.
      [`${klass}x-auto`, `${prop}-left: auto; ${prop}-right: auto;`],
      // Auto y-axis.
      [`${klass}y-auto`, `${prop}-top: auto; ${prop}-bottom: auto;`],
      // Zero x-axis.
      [`${klass}x-0`, `${prop}-left: 0; ${prop}-right: 0;`],
      // Zero y-axis.
      [`${klass}y-0`, `${prop}-top: 0; ${prop}-bottom: 0;`],
      // Positive REM units x-axis.
      ...UNITS_ALL.map((v) => [v, v * REM_UNIT]).map(([k, v]) => [
        `${klass}x-${k}`,
        `${prop}-left: ${v}rem; ${prop}-right: ${v}rem;`,
      ]),
      // Positive REM units y-axis.
      ...UNITS_ALL.map((v) => [v, v * REM_UNIT]).map(([k, v]) => [
        `${klass}y-${k}`,
        `${prop}-top: ${v}rem; ${prop}-bottom: ${v}rem;`,
      ]),
      // Positive PX units x-axis.
      ...UNITS_ALL.map((v) => [`${klass}x-${v}px`, `${prop}-left: ${v}px; ${prop}-right: ${v}px;`]),
      // Positive PX units y-axis.
      ...UNITS_ALL.map((v) => [`${klass}y-${v}px`, `${prop}-top: ${v}px; ${prop}-bottom: ${v}px;`]),
      // Positive percent units x-axis.
      ...PERCENTS.map((v) => [`${klass}x-${v}\\%`, `${prop}-left: ${v}%; ${prop}-right: ${v}%;`]),
      // Positive percent units y-axis.
      ...PERCENTS.map((v) => [`${klass}y-${v}\\%`, `${prop}-top: ${v}%; ${prop}-bottom: ${v}%;`]),
    ])
    .flatMap(([klass, rule]) => [
      `.${klass} { ${rule} }`,
      `${wrapPseudoStates(klass).join(",")} { ${rule} }`,
      ...wrapMediaQueries(klass, rule),
    ]);
}

function tblr(props: { [key: string]: string }): string[] {
  return Object.entries(props)
    .flatMap(([prop, klass]) => [
      // Zero top.
      [`${klass}t-0`, `${prop}-top: 0`],
      // Zero bottom.
      [`${klass}b-0`, `${prop}-bottom: 0`],
      // Zero left.
      [`${klass}l-0`, `${prop}-left: 0`],
      // Zero right.
      [`${klass}r-0`, `${prop}-right: 0`],
      // Auto top.
      [`${klass}t-auto`, `${prop}-top: auto`],
      // Auto bottom.
      [`${klass}b-auto`, `${prop}-bottom: auto`],
      // Auto left.
      [`${klass}l-auto`, `${prop}-left: auto`],
      // Auto right.
      [`${klass}r-auto`, `${prop}-right: auto`],
      // Positive / Negative.
      ...["", "-"].flatMap((sign) => [
        // REM units top.
        ...UNITS_ALL.map((v) => [v, v * REM_UNIT]).map(([k, v]) => [
          `${sign}${klass}t-${k}`,
          `${prop}-top: ${sign}${v}rem`,
        ]),
        // REM units bottom.
        ...UNITS_ALL.map((v) => [v, v * REM_UNIT]).map(([k, v]) => [
          `${sign}${klass}b-${k}`,
          `${prop}-bottom: ${sign}${v}rem`,
        ]),
        // REM units left.
        ...UNITS_ALL.map((v) => [v, v * REM_UNIT]).map(([k, v]) => [
          `${sign}${klass}l-${k}`,
          `${prop}-left: ${sign}${v}rem`,
        ]),
        // REM units right.
        ...UNITS_ALL.map((v) => [v, v * REM_UNIT]).map(([k, v]) => [
          `${sign}${klass}r-${k}`,
          `${prop}-right: ${sign}${v}rem`,
        ]),
        // PX units top.
        ...UNITS_ALL.map((v) => [`${sign}${klass}t-${v}px`, `${prop}-top: ${sign}${v}px`]),
        // PX units bottom.
        ...UNITS_ALL.map((v) => [`${sign}${klass}b-${v}px`, `${prop}-bottom: ${sign}${v}px`]),
        // PX units left.
        ...UNITS_ALL.map((v) => [`${sign}${klass}l-${v}px`, `${prop}-left: ${sign}${v}px`]),
        // PX units right.
        ...UNITS_ALL.map((v) => [`${sign}${klass}r-${v}px`, `${prop}-right: ${sign}${v}px`]),
        // Percent units top.
        ...PERCENTS.map((v) => [`${sign}${klass}t-${v}\\%`, `${prop}-top: ${sign}${v}%`]),
        // Percent units bottom.
        ...PERCENTS.map((v) => [`${sign}${klass}b-${v}\\%`, `${prop}-bottom: ${sign}${v}%;`]),
        // Percent units left.
        ...PERCENTS.map((v) => [`${sign}${klass}l-${v}\\%`, `${prop}-left: ${sign}${v}%`]),
        // Percent units right.
        ...PERCENTS.map((v) => [`${sign}${klass}r-${v}\\%`, `${prop}-right: ${sign}${v}%`]),
      ]),
    ])
    .flatMap(([klass, rule]) => [
      `.${klass} { ${rule} }`,
      `${wrapPseudoStates(klass).join(",")} { ${rule} }`,
      ...wrapMediaQueries(klass, rule),
    ]);
}

function border(): string[] {
  return [
    // Single pixel border.
    [`border`, `border: 1px`],
    // Single pixel border x and y.
    [`border-x`, `border-inline-width: 1px`],
    [`border-y`, `border-block-width: 1px`],
    // Pixel units for border width.
    ...[0, ...UNITS_SM].map((v) => [`border-${v}`, `border-width: ${v}px`]),
    // Pixel units for border x and y.
    ...[0, ...UNITS_SM].map((v) => [`border-x-${v}`, `border-inline-width: ${v}px;`]),
    ...[0, ...UNITS_SM].map((v) => [`border-y-${v}`, `border-block-width: ${v}px;`]),
    // TBLR border.
    ...["top", "bottom", "left", "right"].flatMap((dir) => [
      // Single pixel border.
      [`border-${dir.slice(0, 1)}`, `border-${dir}: 1px`],
      // Pixel units for border width.
      ...[0, ...UNITS_SM].map((v) => [
        `border-${dir.slice(0, 1)}-${v}`,
        `border-${dir}-width: ${v}px`,
      ]),
    ]),
  ].flatMap(([klass, rule]) => [
    `.${klass} { ${rule} }`,
    `${wrapPseudoStates(klass).join(",")} { ${rule} }`,
    ...wrapMediaQueries(klass, rule),
  ]);
}

function zIndex(): string[] {
  return [
    // Percent units reused as values for z-index.
    ...PERCENTS.map((v) => [`z-${v}`, `z-index: ${v}`]),
  ].flatMap(([klass, rule]) => [
    `.${klass} { ${rule} }`,
    `${wrapPseudoStates(klass).join(",")} { ${rule} }`,
    ...wrapMediaQueries(klass, rule),
  ]);
}

function transitions(): string[] {
  return [
    // Positive milliseconds for transition.
    ...DURATIONS.map((v) => [`duration-${v}`, `transition-duration: ${v}ms`]),
  ].flatMap(([klass, rule]) => [
    `.${klass} { ${rule} }`,
    `${wrapPseudoStates(klass).join(",")} { ${rule} }`,
    ...wrapMediaQueries(klass, rule),
  ]);
}

function between(): string[] {
  return [
    // Zero for x margin.
    [`space-x-0 > *`, `margin-left: 0`],
    // Zero for y margin.
    [`space-y-0 > *`, `margin-top: 0`],
    // Positive REM units for x margin.
    ...UNITS_ALL.map((v) => [
      `space-x-${v} > :not(:first-child)`,
      `margin-left: ${v * REM_UNIT}rem`,
    ]),
    // Positive REM units for y margin.
    ...UNITS_ALL.map((v) => [
      `space-y-${v} > :not(:first-child)`,
      `margin-top: ${v * REM_UNIT}rem`,
    ]),
    // Positive PX units for x margin.
    ...UNITS_ALL.map((v) => [`space-x-${v}px > :not(:first-child)`, `margin-left: ${v}px`]),
    // Positive PX units for y margin.
    ...UNITS_ALL.map((v) => [`space-y-${v}px > :not(:first-child)`, `margin-top: ${v}px`]),
    // Zero for gap.
    [`gap-0`, `gap: 0`],
    // Positive REM units for gap.
    ...UNITS_ALL.map((v) => [`gap-${v}`, `gap: ${v * REM_UNIT}rem`]),
    // Positive PX units for gap.
    ...UNITS_ALL.map((v) => [`gap-${v}px`, `gap: ${v}px`]),
    // Positive REM units for col gap.
    ...UNITS_ALL.map((v) => [`gap-x-${v}`, `column-gap: ${v * REM_UNIT}rem`]),
    // Positive REM units for row gap.
    ...UNITS_ALL.map((v) => [`gap-y-${v}`, `row-gap: ${v * REM_UNIT}rem`]),
    // Positive PX units for col gap.
    ...UNITS_ALL.map((v) => [`gap-x-${v}px`, `column-gap: ${v}px`]),
    // Positive PX units for row gap.
    ...UNITS_ALL.map((v) => [`gap-y-${v}px`, `row-gap: ${v}px`]),
  ].flatMap(([klass, rule]) => [
    `.${klass} { ${rule} }`,
    `${wrapPseudoStates(klass).join(",")} { ${rule} }`,
    ...wrapMediaQueries(klass, rule),
  ]);
}

function textSizes(): string[] {
  return [
    // 100 font sizes in single pixel increments.
    ...Array.from({ length: 100 }, (_, i) => i).map((v) => [`text-${v}px`, `font-size: ${v}px`]),
    // 100 font sizes in REM_UNIT (0.25) increments.
    ...Array.from({ length: 100 }, (_, i) => i * REM_UNIT).map((v) => [
      `text-${v}rem`,
      `font-size: ${v}rem`,
    ]),
  ].flatMap(([klass, rule]) => [
    `.${klass} { ${rule} }`,
    `${wrapPseudoStates(klass).join(",")} { ${rule} }`,
    ...wrapMediaQueries(klass, rule),
  ]);
}

function custom(): string[] {
  return Object.entries(PROPS_CUSTOM).flatMap(([klass, props]) =>
    Object.entries(props).flatMap(([propkey, propval]) => [
      `.${klass} { ${propkey}: ${propval} }`,
      `${wrapPseudoStates(klass).join(",")} { ${propkey}: ${propval} }`,
      ...wrapMediaQueries(klass, `${propkey}: ${propval}`),
    ])
  );
}

function colors(): string[] {
  const bw = [
    ["white", "#fff"],
    ["black", "#000"],
    ["transparent", "transparent"],
  ].flatMap(([color, value]) => [
    [`text-${color}`, `color: ${value}`],
    [`fill-${color}`, `fill: ${value}`],
    [`bg-${color}`, `background-color: ${value}`],
    [`border-${color}`, `border-color: ${value}`],
  ]);
  const mains = Object.entries(PROPS_COLORS).flatMap(([color, shades]) => [
    [`text-${color}`, `color: ${hexColor(shades[500])}`],
    [`fill-${color}`, `fill: ${hexColor(shades[500])}`],
    [`bg-${color}`, `background-color: ${hexColor(shades[500])}`],
    [`border-${color}`, `border-color: ${hexColor(shades[500])}`],
  ]);
  const shades = Object.entries(PROPS_COLORS).flatMap(([color, shades]) =>
    Object.entries(shades).flatMap(([shade, hex]) => [
      [`text-${color}-${shade}`, `color: ${hexColor(hex)}`],
      [`fill-${color}-${shade}`, `fill: ${hexColor(hex)}`],
      [`bg-${color}-${shade}`, `background-color: ${hexColor(hex)}`],
      [`border-${color}-${shade}`, `border-color: ${hexColor(hex)}`],
    ])
  );
  return ([] as string[][])
    .concat(bw)
    .concat(mains)
    .concat(shades)
    .flatMap(([klass, rule]) => [
      `.${klass} { ${rule} }`,
      `${wrapPseudoStates(klass).join(",")} { ${rule} }`,
      ...wrapMediaQueries(klass, rule),
    ]);
}

function opacity(): string[] {
  return [
    // Zero for opacity.
    [`opacity-0`, `opacity: 0`],
    // Positive percent units for opacity.
    ...PERCENTS.map((v) => [`opacity-${v}`, `opacity: ${v / 100}`]),
  ].flatMap(([klass, rule]) => [
    `.${klass} { ${rule} }`,
    `${wrapPseudoStates(klass).join(",")} { ${rule} }`,
    ...wrapMediaQueries(klass, rule),
  ]);
}

export default function rules(): string {
  return (
    [
      // As-is.
      ...PROPS_AS_IS,
      // Custom.
      ...custom(),
      // Colors.
      ...colors(),
      // Opacity.
      ...opacity(),
      // Z-Index.
      ...zIndex(),
      // Transitions.
      ...transitions(),
      // Position.
      ...posneg(PROPS_POSITION),
      // Sizing.
      ...posneg(PROPS_SIZING),
      ...autoxy(PROPS_SIZING),
      // Spacing.
      ...tblr(PROPS_SPACING),
      ...posneg(PROPS_SPACING),
      ...autoxy(PROPS_SPACING),
      ...between(),
      // Minmax.
      ...posneg(PROPS_SIZING_MINMAX),
      // Border.
      ...border(),
      // Text sizes.
      ...textSizes(),
    ]
      // Sort lexicographical to ensure media queries appear after their base rules.
      .sort(ruleSorter)
      .join("\n")
  );
}
