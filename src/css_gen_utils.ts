const REM_UNIT = 0.25;
const UNITS_SM = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const UNITS_LG = [16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60];
const UNITS_XL = [64, 72, 80, 96, 112, 128, 144, 160, 192, 224, 256, 288, 320, 384, 448, 512];
const UNITS_ALL = [...UNITS_SM, ...UNITS_LG, ...UNITS_XL];
const PERCENTS = [1, 2, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 98, 99, 100];
const PSEUDO_STATES = ["hover", "focus", "disabled", "focus", "active"];
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
  // Based on https://matcha.mizu.sh/@utilities.css.
  // Text style.
  bold: { "font-weight": "bold" },
  semibold: { "font-weight": 600 },
  italic: { "font-style": "italic" },
  underline: { "text-decoration": "underline" },
  strikethrough: { "text-decoration": "line-through" },
  uppercase: { "text-transform": "uppercase" },
  lowercase: { "text-transform": "lowercase" },
  capitalize: { "text-transform": "capitalize" },
  centered: { "text-align": "center" },
  justified: { "text-align": "justify" },
  monospace: { "font-family": "monospace" },
  // Text position.
  "text-left": { "text-align": "left" },
  "text-right": { "text-align": "right" },
  "text-center": { "text-align": "center" },
  "text-justify": { "text-align": "justify" },
  // Font size.
  "text-xs": { "font-size": ".85rem" },
  "text-sm": { "font-size": ".875rem" },
  "text-md": { "font-size": "1rem" },
  "text-lg": { "font-size": "1.25rem" },
  "text-xl": { "font-size": "1.5rem" },
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
  hidden: { display: "none" },
  inline: { display: "inline" },
  block: { display: "block" },
  "block.inline": { display: "inline-block" },
  flex: { display: "flex" },
  "flex.inline": { display: "inline-flex" },
  content: { display: "contents" },
  // Flex.
  "flex.row": { "flex-direction": "row" },
  "flex.column": { "flex-direction": "column" },
  "flex.row.reverse": { "flex-direction": "row-reverse" },
  "flex.column.reverse": { "flex-direction": "column-reverse" },
  "flex.wrap": { "flex-wrap": "wrap" },
  "flex.wrap.reverse": { "flex-wrap": "wrap-reverse" },
  "flex.no-wrap": { "flex-wrap": "nowrap" },
  "flex.start": { "justify-content": "flex-start" },
  "flex.end": { "justify-content": "flex-end" },
  "flex.center": { "justify-content": "center" },
  "flex.space-between": { "justify-content": "space-between" },
  "flex.space-around": { "justify-content": "space-around" },
  "flex.space-evenly": { "justify-content": "space-evenly" },
  "flex.stretch": { "justify-content": "stretch" },
  "flex.align-start": { "align-items": "flex-start" },
  "flex.align-end": { "align-items": "flex-end" },
  "flex.align-center": { "align-items": "center" },
  "flex.align-stretch": { "align-items": "stretch" },
  grow: { "flex-grow": 1 },
  shrink: { "flex-shrink": 1 },
  // Overflow.
  overflow: { overflow: "auto" },
  "overflow-x": { "overflow-x": "auto" },
  "overflow-y": { "overflow-y": "auto" },
  "no-overflow": { overflow: "hidden" },
  // Cursors.
  pointer: { cursor: "pointer" },
  wait: { cursor: "wait" },
  "not-allowed": { cursor: "not-allowed" },
  // User selection.
  "no-select": { "user-select": "none" },
  "select-all": { "user-select": "all" },
  // Events.
  events: { "pointer-events": "auto" },
  "no-events": { "pointer-events": "none" },
  // Sizing.
  "border-box": { "box-sizing": "border-box" },
  "content-box": { "box-sizing": "content-box" },
  // Resizing.
  resize: { resize: "both" },
  "resize-x": { resize: "horizontal" },
  "resize-y": { resize: "vertical" },
  "no-resize": { resize: "none" },
  // Colors.
  transparent: { color: "transparent" },
  "bg-transparent": { "background-color": "transparent" },
  "border-transparent": { "border-color": "transparent" },
  // Borders.
  "border-none": { border: "none" },
  "border-solid": { "border-style": "solid" },
  "border-dashed": { "border-style": "dashed" },
  "border-dotted": { "border-style": "dotted" },
  // Radius.
  "rounded-none": { "border-radius": "0" },
  "rounded-sm": { "border-radius": ".125rem" },
  "rounded-md": { "border-radius": ".25rem" },
  "rounded-lg": { "border-radius": ".5rem" },
  // Transitions.
  "transition-none": { transition: "none" },
  transition: { transition: "all 150ms" },
};
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
  grey: {
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
  "blue-grey": {
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

function wrapPseudoStates(klass: string): string[] {
  return PSEUDO_STATES.map((state) => `.${state}\\:${klass}:${state}`);
}

function posneg(props: { [key: string]: string }): string[] {
  return Object.entries(props)
    .map(([prop, klass]) => [
      // Zero.
      `.${klass}-0 { ${prop}: 0; }`,
      // Screen.
      `.${klass}-screen { ${prop}: 100vw; }`,
      // Full.
      `.${klass}-full { ${prop}: 100%; }`,
      // Positive REM units.
      ...UNITS_ALL.map((v) => `.${klass}-${v} { ${prop}: ${v * REM_UNIT}rem; }`),
      // Negative REM units.
      ...UNITS_ALL.map((v) => `.-${klass}-${v} { ${prop}: -${v * REM_UNIT}rem; }`),
      // Positive PX units.
      ...UNITS_ALL.map((v) => `.${klass}-${v}px { ${prop}: ${v}px; }`),
      // Negative PX units.
      ...UNITS_ALL.map((v) => `.-${klass}-${v}px { ${prop}: -${v}px; }`),
      // Positive percent units.
      ...PERCENTS.map((v) => `.${klass}-${v}% { ${prop}: ${v}%; }`),
      // Negative percent units.
      ...PERCENTS.map((v) => `.-${klass}-${v}% { ${prop}: -${v}%; }`),
      // Positive REM units x-axis.
      ...UNITS_ALL.map(
        (v) =>
          `.${klass}x-${v} { ${prop}-left: ${v * REM_UNIT}rem; ${prop}-right: ${v * REM_UNIT}rem; }`
      ),
      // Positive REM units y-axis.
      ...UNITS_ALL.map(
        (v) =>
          `.${klass}y-${v} { ${prop}-top: ${v * REM_UNIT}rem; ${prop}-bottom: ${v * REM_UNIT}rem; }`
      ),
      // Positive PX units x-axis.
      ...UNITS_ALL.map((v) => `.${klass}x-${v}px { ${prop}-left: ${v}px; ${prop}-right: ${v}px; }`),
      // Positive PX units y-axis.
      ...UNITS_ALL.map((v) => `.${klass}y-${v}px { ${prop}-top: ${v}px; ${prop}-bottom: ${v}px; }`),
      // Positive percent units x-axis.
      ...PERCENTS.map((v) => `.${klass}x-${v}% { ${prop}-left: ${v}%; ${prop}-right: ${v}%; }`),
      // Positive percent units y-axis.
      ...PERCENTS.map((v) => `.${klass}y-${v}% { ${prop}-top: ${v}%; ${prop}-bottom: ${v}%; }`),
    ])
    .flat();
}

function autoxy(props: { [key: string]: string }): string[] {
  return Object.entries(props)
    .map(([prop, klass]) => [
      // Auto.
      `.${klass}-auto { ${prop}: auto; }`,
      // Auto x-axis.
      `.${klass}x-auto { ${prop}-left: auto; ${prop}-right: auto; }`,
      // Auto y-axis.
      `.${klass}y-auto { ${prop}-top: auto; ${prop}-bottom: auto; }`,
      // Positive REM units x-axis.
      ...UNITS_ALL.map(
        (v) =>
          `.${klass}x-${v} { ${prop}-left: ${v * REM_UNIT}rem; ${prop}-right: ${v * REM_UNIT}rem; }`
      ),
      // Positive REM units y-axis.
      ...UNITS_ALL.map(
        (v) =>
          `.${klass}y-${v} { ${prop}-top: ${v * REM_UNIT}rem; ${prop}-bottom: ${v * REM_UNIT}rem; }`
      ),
      // Positive PX units x-axis.
      ...UNITS_ALL.map((v) => `.${klass}x-${v}px { ${prop}-left: ${v}px; ${prop}-right: ${v}px; }`),
      // Positive PX units y-axis.
      ...UNITS_ALL.map((v) => `.${klass}y-${v}px { ${prop}-top: ${v}px; ${prop}-bottom: ${v}px; }`),
      // Positive percent units x-axis.
      ...PERCENTS.map((v) => `.${klass}x-${v}% { ${prop}-left: ${v}%; ${prop}-right: ${v}%; }`),
      // Positive percent units y-axis.
      ...PERCENTS.map((v) => `.${klass}y-${v}% { ${prop}-top: ${v}%; ${prop}-bottom: ${v}%; }`),
    ])
    .flat();
}

function border(): string[] {
  return [
    // Zero for border width.
    `.border-0 { border-width: 0; }`,
    // Pixel units for border width.
    ...UNITS_SM.map((v) => `.border-${v} { border-width: ${v}px; }`),
  ];
}

function between(): string[] {
  return [
    // Zero for x margin.
    `.space-x-0 > * { margin-left: 0; }`,
    // Zero for y margin.
    `.space-y-0 > * { margin-top: 0; }`,
    // Positive REM units for x margin.
    ...UNITS_ALL.map(
      (v) => `.space-x-${v} > :not(:first-child) { margin-left: ${v * REM_UNIT}rem; }`
    ),
    // Positive REM units for y margin.
    ...UNITS_ALL.map(
      (v) => `.space-y-${v} > :not(:first-child) { margin-top: ${v * REM_UNIT}rem; }`
    ),
    // Positive PX units for x margin.
    ...UNITS_ALL.map((v) => `.space-x-${v}px > :not(:first-child) { margin-left: ${v}px; }`),
    // Positive PX units for y margin.
    ...UNITS_ALL.map((v) => `.space-y-${v}px > :not(:first-child) { margin-top: ${v}px; }`),
    // Zero for gap.
    `.gap-0 { gap: 0; }`,
    // Positive REM units for gap.
    ...UNITS_ALL.map((v) => `.gap-${v} { gap: ${v * REM_UNIT}rem; }`),
    // Positive PX units for gap.
    ...UNITS_ALL.map((v) => `.gap-${v}px { gap: ${v}px; }`),
    // Positive REM units for col gap.
    ...UNITS_ALL.map((v) => `.gap-col-${v} { column-gap: ${v * REM_UNIT}rem; }`),
    // Positive REM units for row gap.
    ...UNITS_ALL.map((v) => `.gap-row-${v} { row-gap: ${v * REM_UNIT}rem; }`),
    // Positive PX units for col gap.
    ...UNITS_ALL.map((v) => `.gap-col-${v}px { column-gap: ${v}px; }`),
    // Positive PX units for row gap.
    ...UNITS_ALL.map((v) => `.gap-row-${v}px { row-gap: ${v}px; }`),
  ];
}

function custom(): string[] {
  return Object.entries(PROPS_CUSTOM)
    .map(([klass, props]) =>
      Object.entries(props).map(
        ([key, val]) => `.${klass},${wrapPseudoStates(klass).join(",")} { ${key}: ${val}; }`
      )
    )
    .flat();
}

function colors(): string[] {
  const mains = Object.entries(PROPS_COLORS)
    .map(([color, shades]) => [
      [`${color}`, `{ color: #${shades[500].toString(16)}; }`],
      [`${color}-bg`, `{ background-color: #${shades[500].toString(16)}; }`],
      [`${color}-border`, `{ border-color: #${shades[500].toString(16)}; }`],
    ])
    .flat();
  const shades = Object.entries(PROPS_COLORS)
    .map(([color, shades]) =>
      Object.entries(shades)
        .map(([shade, hex]) => [
          [`${color}-${shade}`, `{ color: #${hex.toString(16)}; }`],
          [`bg-${color}-${shade}`, `{ background-color: #${hex.toString(16)}; }`],
          [`border-${color}-${shade}`, `{ border-color: #${hex.toString(16)}; }`],
        ])
        .flat()
    )
    .flat();
  return mains
    .concat(shades)
    .map(([klass, rule]) => `.${klass},${wrapPseudoStates(klass).join(",")} ${rule}`);
}

function opacity(): string[] {
  return [
    // Zero for opacity.
    `.opacity-0 { opacity: 0; }`,
    // Positive percent units for opacity.
    ...PERCENTS.map((v) => `.opacity-${v} { opacity: ${v / 100}; }`),
  ];
}

export default function rules(): string {
  return [
    // Custom.
    ...custom(),
    // Colors.
    ...colors(),
    // Opacity.
    ...opacity(),
    // Sizing.
    ...posneg(PROPS_SIZING),
    ...autoxy(PROPS_SIZING),
    // Position.
    ...posneg(PROPS_POSITION),
    ...autoxy(PROPS_POSITION),
    // Spacing.
    ...posneg(PROPS_SPACING),
    ...autoxy(PROPS_SPACING),
    ...between(),
    // Minmax.
    ...posneg(PROPS_SIZING_MINMAX),
    // Border.
    ...border(),
  ].join("\n");
}
