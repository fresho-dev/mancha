# CSS Documentation

Mancha provides a set of CSS utilities and minimal styles to help you build your application.

## Minimal CSS

The minimal CSS rules provide a clean, readable default style for standard HTML elements. You can inject them using `injectMinimalCss()` or by adding `css="minimal"` to your script tag.

### Reset & Defaults
- **Max Width**: 70ch (centered)
- **Padding**: 2em 1em
- **Line Height**: 1.75
- **Font Family**: sans-serif
- **H1-H6 Margin**: 1em 0 0.5em
- **P, UL, OL Margin Bottom**: 1em

## Basic CSS

The basic CSS rules provide a more comprehensive reset and set of defaults, widely based on Tailwind CSS Preflight. You can inject them using `injectBasicCss()` or by adding `css="basic"` to your script tag.

### Key Features
- **Box Sizing**: `border-box` globally
- **Typography**: Default sans-serif font stack, consistent line-height
- **Form Elements**: Inherit font styles, transparent backgrounds, `cursor: pointer` for buttons
- **Media**: Images/videos max-width 100%
- **Dialog**: Default backdrop styling
- **Resets**: Removes default margins/paddings from most block elements

## Utility CSS

The utility CSS rules are inspired by Tailwind CSS. You can inject them using `injectUtilsCss()` or by adding `css="utils"` to your script tag.

### Media Breakpoints

| Prefix | Min Width |
| --- | --- |
| `sm:` | `640px` |
| `md:` | `768px` |
| `lg:` | `1024px` |
| `xl:` | `1280px` |

### Pseudo States

The following pseudo states are supported for all utilities:
- `hover:`
- `focus:`
- `disabled:`
- `active:`

### Spacing (Margin & Padding)

Spacing utilities use a 0.25rem (4px) unit by default.

| Prefix | Property | Values |
| --- | --- | --- |
| `m-` | `margin` | `0`, `0.25rem` - `128rem` (and negative versions) |
| `mx-` | `margin-left/right` | Same as above |
| `my-` | `margin-top/bottom` | Same as above |
| `mt-` | `margin-top` | Same as above |
| `mb-` | `margin-bottom` | Same as above |
| `ml-` | `margin-left` | Same as above |
| `mr-` | `margin-right` | Same as above |
| `p-` | `padding` | `0`, `0.25rem` - `128rem` (and negative versions) |
| `px-` | `padding-left/right` | Same as above |
| `py-` | `padding-top/bottom` | Same as above |
| `pt-` | `padding-top` | Same as above |
| `pb-` | `padding-bottom` | Same as above |
| `pl-` | `padding-left` | Same as above |
| `pr-` | `padding-right` | Same as above |

### Sizing (Width & Height)

| Prefix | Property | Values |
| --- | --- | --- |
| `w-` | `width` | `0`, `full` (100%), `screen` (100vw/vh), `auto`, `px`, `0.25rem` - `128rem` |
| `w-sm/md/lg/xl` | `width` | Match media breakpoints (e.g. `w-sm`, `max-w-lg`) |
| `w-dvw/dvh/svw/svh/lvw/lvh` | `width` | Viewport-relative units |
| `w-fit/min/max` | `width` | `fit-content`, `min-content`, `max-content` |
| `h-` | `height` | `0`, `full` (100%), `screen` (100vw/vh), `auto`, `px`, `0.25rem` - `128rem` |
| `h-sm/md/lg/xl` | `height` | Match media breakpoints (e.g. `w-sm`, `max-w-lg`) |
| `h-dvw/dvh/svw/svh/lvw/lvh` | `height` | Viewport-relative units |
| `h-fit/min/max` | `height` | `fit-content`, `min-content`, `max-content` |
| `min-w-` | `min-width` | Same as sizing |
| `min-h-` | `min-height` | Same as sizing |
| `max-w-` | `max-width` | Same as sizing |
| `max-h-` | `max-height` | Same as sizing |
| `size-` | `width` & `height` | `auto`, `px`, `full`, `dvw`, `dvh`, `svw`, `svh`, `lvw`, `lvh`, `min`, `max`, `fit` |

### Colors

Supported prefixes: `text-`, `bg-`, `border-`, `fill-`.

| Color | Shades |
| --- | --- |
| `white`, `black`, `transparent` | N/A |
| `red` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `pink` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `purple` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `deep-purple` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `indigo` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `blue` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `light-blue` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `cyan` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `teal` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `green` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `light-green` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `lime` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `yellow` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `amber` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `orange` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `deep-orange` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `brown` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `gray` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `blue-gray` | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |

You can also control the opacity of any color utility by appending `/{opacity}`:
- `bg-black/50`
- `text-red-500/20`
- `border-blue-600/100`

### Borders & Corners

| Utility | Description |
| --- | --- |
| `border` | `{"border":"1px solid"}` |
| `border-none` | `{"border":"none"}` |
| `border-solid` | `{"border-style":"solid"}` |
| `border-dashed` | `{"border-style":"dashed"}` |
| `border-dotted` | `{"border-style":"dotted"}` |
| `border-collapse` | `{"border-collapse":"collapse"}` |
| `rounded-none` | `{"border-radius":"0"}` |
| `rounded` | `{"border-radius":".25rem"}` |
| `rounded-sm` | `{"border-radius":".125rem"}` |
| `rounded-md` | `{"border-radius":".375rem"}` |
| `rounded-lg` | `{"border-radius":".5rem"}` |
| `rounded-xl` | `{"border-radius":".75rem"}` |
| `rounded-full` | `{"border-radius":"9999px"}` |
| `border-{0-15}` | Border width in pixels (e.g., `border-0`, `border-1`, ..., `border-15`) |
| `border-x-{0-15}` | Horizontal border width in pixels |
| `border-y-{0-15}` | Vertical border width in pixels |
| `border-{t,b,l,r}-{0-15}` | Individual side border width in pixels |

### Shadows & Effects

| Utility | Description |
| --- | --- |
| `shadow-2xs` | `{"box-shadow":"0 1px rgb(0 0 0 / 0.05)"}` |
| `shadow-xs` | `{"box-shadow":"0 1px 2px 0 rgb(0 0 0 / 0.05)"}` |
| `shadow` | `{"box-shadow":"0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"}` |
| `shadow-sm` | `{"box-shadow":"0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"}` |
| `shadow-md` | `{"box-shadow":"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"}` |
| `shadow-lg` | `{"box-shadow":"0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"}` |
| `shadow-xl` | `{"box-shadow":"0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"}` |
| `shadow-2xl` | `{"box-shadow":"0 25px 50px -12px rgb(0 0 0 / 0.25)"}` |
| `shadow-inner` | `{"box-shadow":"inset 0 2px 4px 0 rgb(0 0 0 / 0.05)"}` |
| `shadow-none` | `{"box-shadow":"0 0 #0000"}` |
| `ring` | `{"box-shadow":"var(--ring-inset, ) 0 0 0 3px rgb(59 130 246 / 0.5)"}` |
| `ring-0` | `{"box-shadow":"var(--ring-inset, ) 0 0 0 0px rgb(59 130 246 / 0.5)"}` |
| `ring-1` | `{"box-shadow":"var(--ring-inset, ) 0 0 0 1px rgb(59 130 246 / 0.5)"}` |
| `ring-2` | `{"box-shadow":"var(--ring-inset, ) 0 0 0 2px rgb(59 130 246 / 0.5)"}` |
| `ring-4` | `{"box-shadow":"var(--ring-inset, ) 0 0 0 4px rgb(59 130 246 / 0.5)"}` |
| `ring-8` | `{"box-shadow":"var(--ring-inset, ) 0 0 0 8px rgb(59 130 246 / 0.5)"}` |
| `ring-inset` | `{"--ring-inset":"inset"}` |
| `opacity-0` | Fully transparent |
| `opacity-{1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100}` | Opacity values from 0-100 |

### Outline

| Utility | Description |
| --- | --- |
| `outline` | `{"outline-style":"solid"}` |
| `outline-none` | `{"outline":"2px solid transparent","outline-offset":"2px"}` |
| `outline-dashed` | `{"outline-style":"dashed"}` |
| `outline-dotted` | `{"outline-style":"dotted"}` |
| `outline-double` | `{"outline-style":"double"}` |
| `outline-0` | `{"outline-width":"0px"}` |
| `outline-1` | `{"outline-width":"1px"}` |
| `outline-2` | `{"outline-width":"2px"}` |
| `outline-4` | `{"outline-width":"4px"}` |
| `outline-8` | `{"outline-width":"8px"}` |
| `outline-offset-0` | `{"outline-offset":"0px"}` |
| `outline-offset-1` | `{"outline-offset":"1px"}` |
| `outline-offset-2` | `{"outline-offset":"2px"}` |
| `outline-offset-4` | `{"outline-offset":"4px"}` |
| `outline-offset-8` | `{"outline-offset":"8px"}` |

### Aspect Ratio

| Utility | Description |
| --- | --- |
| `aspect-auto` | `{"aspect-ratio":"auto"}` |
| `aspect-square` | `{"aspect-ratio":"1 / 1"}` |
| `aspect-video` | `{"aspect-ratio":"16 / 9"}` |

### Backdrop Filters

| Utility | Description |
| --- | --- |
| `backdrop-blur-none` | `{"backdrop-filter":"blur(0)"}` |
| `backdrop-blur-sm` | `{"backdrop-filter":"blur(4px)"}` |
| `backdrop-blur` | `{"backdrop-filter":"blur(8px)"}` |
| `backdrop-blur-md` | `{"backdrop-filter":"blur(12px)"}` |
| `backdrop-blur-lg` | `{"backdrop-filter":"blur(16px)"}` |
| `backdrop-blur-xl` | `{"backdrop-filter":"blur(24px)"}` |
| `backdrop-blur-2xl` | `{"backdrop-filter":"blur(40px)"}` |
| `backdrop-blur-3xl` | `{"backdrop-filter":"blur(64px)"}` |

### Transitions & Animations

| Utility | Description |
| --- | --- |
| `transition-none` | `{"transition":"none"}` |
| `transition` | `{"transition-property":"all","transition-timing-function":"ease-in-out","transition-duration":"var(--transition-duration, 150ms)"}` |
| `animate-none` | `{"animation":"none"}` |
| `animate-spin` | `{"animation":"spin 1s linear infinite"}` |
| `animate-ping` | `{"animation":"ping 1s cubic-bezier(0, 0, 0.2, 1) infinite"}` |
| `animate-pulse` | `{"animation":"pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"}` |
| `duration-{25,50,75,100,150,200,300,500,700,1000}` | Transition duration in milliseconds |

### Interactivity

| Utility | Description |
| --- | --- |
| `cursor-pointer` | `{"cursor":"pointer"}` |
| `cursor-wait` | `{"cursor":"wait"}` |
| `cursor-not-allowed` | `{"cursor":"not-allowed"}` |
| `select-none` | `{"user-select":"none"}` |
| `select-all` | `{"user-select":"all"}` |
| `pointer-events-auto` | `{"pointer-events":"auto"}` |
| `pointer-events-none` | `{"pointer-events":"none"}` |
| `resize` | `{"resize":"both"}` |
| `resize-x` | `{"resize":"horizontal"}` |
| `resize-y` | `{"resize":"vertical"}` |
| `resize-none` | `{"resize":"none"}` |

### Typography

| Utility | Description |
| --- | --- |
| `font-mono` | `{"font-family":"monospace"}` |
| `font-sans` | `{"font-family":"sans-serif"}` |
| `font-serif` | `{"font-family":"serif"}` |
| `font-cursive` | `{"font-family":"cursive"}` |
| `text-xs` | `{"font-size":".75rem","line-height":"calc(1 / 0.75)"}` |
| `text-sm` | `{"font-size":".875rem","line-height":"calc(1.25 / 0.875)"}` |
| `text-base` | `{"font-size":"1rem","line-height":"calc(1.5 / 1)"}` |
| `text-lg` | `{"font-size":"1.125rem","line-height":"calc(1.75 / 1.125)"}` |
| `text-xl` | `{"font-size":"1.25rem","line-height":"calc(1.75 / 1.25)"}` |
| `text-2xl` | `{"font-size":"1.5rem","line-height":"calc(2 / 1.5)"}` |
| `text-3xl` | `{"font-size":"1.875rem","line-height":"calc(2.25 / 1.875)"}` |
| `text-4xl` | `{"font-size":"2.25rem","line-height":"calc(2.5 / 2.25)"}` |
| `text-5xl` | `{"font-size":"3rem","line-height":"1"}` |
| `text-6xl` | `{"font-size":"3.75rem","line-height":"1"}` |
| `text-7xl` | `{"font-size":"4.5rem","line-height":"1"}` |
| `font-thin` | `{"font-weight":100}` |
| `font-extralight` | `{"font-weight":200}` |
| `font-light` | `{"font-weight":300}` |
| `font-normal` | `{"font-weight":400}` |
| `font-medium` | `{"font-weight":500}` |
| `font-semibold` | `{"font-weight":600}` |
| `font-bold` | `{"font-weight":700}` |
| `font-extrabold` | `{"font-weight":800}` |
| `font-black` | `{"font-weight":900}` |
| `italic` | `{"font-style":"italic"}` |
| `not-italic` | `{"font-style":"normal"}` |
| `tracking-tighter` | `{"letter-spacing":"-0.05em"}` |
| `tracking-tight` | `{"letter-spacing":"-0.025em"}` |
| `tracking-normal` | `{"letter-spacing":"0"}` |
| `tracking-wide` | `{"letter-spacing":"0.025em"}` |
| `tracking-wider` | `{"letter-spacing":"0.05em"}` |
| `tracking-widest` | `{"letter-spacing":"0.1em"}` |
| `leading-none` | `{"line-height":"1"}` |
| `leading-tight` | `{"line-height":"1.25"}` |
| `leading-snug` | `{"line-height":"1.375"}` |
| `leading-normal` | `{"line-height":"1.5"}` |
| `leading-relaxed` | `{"line-height":"1.625"}` |
| `leading-loose` | `{"line-height":"2"}` |
| `text-left` | `{"text-align":"left"}` |
| `text-right` | `{"text-align":"right"}` |
| `text-center` | `{"text-align":"center"}` |
| `text-justify` | `{"text-align":"justify"}` |
| `underline` | `{"text-decoration":"underline"}` |
| `decoration-none` | `{"text-decoration":"none"}` |
| `line-through` | `{"text-decoration":"line-through"}` |
| `uppercase` | `{"text-transform":"uppercase"}` |
| `lowercase` | `{"text-transform":"lowercase"}` |
| `capitalize` | `{"text-transform":"capitalize"}` |
| `truncate` | `{"white-space":"nowrap","overflow":"hidden","text-overflow":"ellipsis"}` |
| `text-elipsis` | `{"text-overflow":"ellipsis"}` |
| `text-clip` | `{"text-overflow":"clip"}` |
| `text-wrap` | `{"text-wrap":"wrap"}` |
| `text-nowrap` | `{"text-wrap":"nowrap"}` |
| `text-balance` | `{"text-wrap":"balance"}` |
| `text-pretty` | `{"text-wrap":"pretty"}` |
| `whitespace-normal` | `{"white-space":"normal"}` |
| `whitespace-nowrap` | `{"white-space":"nowrap"}` |
| `whitespace-pre` | `{"white-space":"pre"}` |
| `whitespace-pre-line` | `{"white-space":"pre-line"}` |
| `whitespace-pre-wrap` | `{"white-space":"pre-wrap"}` |
| `whitespace-break-spaces` | `{"white-space":"break-spaces"}` |

### Flexbox & Layout

| Utility | Description |
| --- | --- |
| `flex` | `{"display":"flex"}` |
| `flex-1` | `{"flex":"1 1 0%"}` |
| `flex-inline` | `{"display":"inline-flex"}` |
| `flex-row` | `{"flex-direction":"row"}` |
| `flex-col` | `{"flex-direction":"column"}` |
| `flex-row-reverse` | `{"flex-direction":"row-reverse"}` |
| `flex-col-reverse` | `{"flex-direction":"column-reverse"}` |
| `flex-wrap` | `{"flex-wrap":"wrap"}` |
| `flex-wrap-reverse` | `{"flex-wrap":"wrap-reverse"}` |
| `flex-nowrap` | `{"flex-wrap":"nowrap"}` |
| `justify-start` | `{"justify-content":"flex-start"}` |
| `justify-end` | `{"justify-content":"flex-end"}` |
| `justify-center` | `{"justify-content":"center"}` |
| `justify-between` | `{"justify-content":"space-between"}` |
| `justify-around` | `{"justify-content":"space-around"}` |
| `justify-evenly` | `{"justify-content":"space-evenly"}` |
| `justify-stretch` | `{"justify-content":"stretch"}` |
| `items-start` | `{"align-items":"flex-start"}` |
| `items-end` | `{"align-items":"flex-end"}` |
| `items-center` | `{"align-items":"center"}` |
| `items-stretch` | `{"align-items":"stretch"}` |
| `flex-grow` | `{"flex-grow":1}` |
| `flex-shrink` | `{"flex-shrink":1}` |
| `flex-none` | `{"flex":"none"}` |
| `flex-auto` | `{"flex":"1 1 auto"}` |
| `flex-initial` | `{"flex":"0 1 auto"}` |
| `grow` | `{"flex-grow":"1"}` |
| `grow-0` | `{"flex-grow":"0"}` |
| `shrink` | `{"flex-shrink":"1"}` |
| `shrink-0` | `{"flex-shrink":"0"}` |
| `self-auto` | `{"align-self":"auto"}` |
| `self-start` | `{"align-self":"flex-start"}` |
| `self-end` | `{"align-self":"flex-end"}` |
| `self-center` | `{"align-self":"center"}` |
| `self-stretch` | `{"align-self":"stretch"}` |
| `self-baseline` | `{"align-self":"baseline"}` |
| `content-normal` | `{"align-content":"normal"}` |
| `content-start` | `{"align-content":"flex-start"}` |
| `content-end` | `{"align-content":"flex-end"}` |
| `content-center` | `{"align-content":"center"}` |
| `content-between` | `{"align-content":"space-between"}` |
| `content-around` | `{"align-content":"space-around"}` |
| `content-evenly` | `{"align-content":"space-evenly"}` |
| `content-stretch` | `{"align-content":"stretch"}` |
| `items-baseline` | `{"align-items":"baseline"}` |
| `gap-0` | No gap |
| `gap-{1-512}` | Gap in rem units (0.25rem increments) |
| `gap-{1-512}px` | Gap in pixels |
| `gap-x-{1-512}` | Horizontal gap in rem units |
| `gap-y-{1-512}` | Vertical gap in rem units |
| `gap-x-{1-512}px` | Horizontal gap in pixels |
| `gap-y-{1-512}px` | Vertical gap in pixels |
| `space-x-{0-512}` | Horizontal spacing between children (rem) |
| `space-y-{0-512}` | Vertical spacing between children (rem) |
| `space-x-{0-512}px` | Horizontal spacing between children (px) |
| `space-y-{0-512}px` | Vertical spacing between children (px) |
| `divide-x` | Add 1px vertical border between horizontal children |
| `divide-y` | Add 1px horizontal border between vertical children |
| `divide-x-{0,2,4,8}` | Vertical border width between horizontal children |
| `divide-y-{0,2,4,8}` | Horizontal border width between vertical children |
| `divide-solid` | Solid border style for dividers |
| `divide-dashed` | Dashed border style for dividers |
| `divide-dotted` | Dotted border style for dividers |
| `divide-none` | Remove divider borders |

### Grid Layout

| Utility | Description |
| --- | --- |
| `grid` | `{"display":"grid"}` |
| `grid-cols-{1-12}` | `grid-template-columns: repeat(n, minmax(0, 1fr))` |
| `grid-cols-none` | `grid-template-columns: none` |
| `col-span-{1-12}` | `grid-column: span n / span n` |
| `col-span-full` | `grid-column: 1 / -1` |
| `col-start-{1-13}` | `grid-column-start: n` |
| `col-end-{1-13}` | `grid-column-end: n` |
| `col-start/end-auto` | `grid-column-start/end: auto` |

### Position & Inset

| Utility | Description |
| --- | --- |
| `relative` | `{"position":"relative"}` |
| `fixed` | `{"position":"fixed"}` |
| `absolute` | `{"position":"absolute"}` |
| `sticky` | `{"position":"sticky"}` |
| `object-contain` | `{"object-fit":"contain"}` |
| `object-cover` | `{"object-fit":"cover"}` |
| `object-fill` | `{"object-fit":"fill"}` |
| `object-none` | `{"object-fit":"none"}` |
| `inset-0` | `{"inset":"0"}` |
| `inset-auto` | `{"inset":"auto"}` |
| `inset-x-0` | `{"left":"0","right":"0"}` |
| `inset-y-0` | `{"top":"0","bottom":"0"}` |
| `inset-x-auto` | `{"left":"auto","right":"auto"}` |
| `inset-y-auto` | `{"top":"auto","bottom":"auto"}` |
| `top-{0-512}`, `bottom-{0-512}`, `left-{0-512}`, `right-{0-512}` | Position in rem units (0.25rem increments) |
| `top-{0-512}px`, `bottom-{0-512}px`, `left-{0-512}px`, `right-{0-512}px` | Position in pixels |
| `top-{1-100}%`, `bottom-{1-100}%`, `left-{1-100}%`, `right-{1-100}%` | Position in percentages |
| `top-auto`, `bottom-auto`, `left-auto`, `right-auto` | Auto positioning |
| `z-{1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100}` | Z-index values |

### Display & Visibility

| Utility | Description |
| --- | --- |
| `block` | `{"display":"block"}` |
| `contents` | `{"display":"contents"}` |
| `hidden` | `{"display":"none"}` |
| `inline` | `{"display":"inline"}` |
| `visible` | `{"visibility":"visible"}` |
| `invisible` | `{"visibility":"hidden"}` |
| `collapse` | `{"visibility":"collapse"}` |

### Overflow & Scrolling

| Utility | Description |
| --- | --- |
| `overflow-auto` | `{"overflow":"auto"}` |
| `overflow-x-auto` | `{"overflow-x":"auto"}` |
| `overflow-y-auto` | `{"overflow-y":"auto"}` |
| `overflow-hidden` | `{"overflow":"hidden"}` |
| `overflow-x-hidden` | `{"overflow-x":"hidden"}` |
| `overflow-y-hidden` | `{"overflow-y":"hidden"}` |
| `overflow-visible` | `{"overflow":"visible"}` |
| `overscroll-auto` | `{"overscroll-behavior":"auto"}` |
| `overscroll-contain` | `{"overscroll-behavior":"contain"}` |
| `overscroll-none` | `{"overscroll-behavior":"none"}` |
| `overscroll-x-auto` | `{"overscroll-behavior-x":"auto"}` |
| `overscroll-x-contain` | `{"overscroll-behavior-x":"contain"}` |
| `overscroll-x-none` | `{"overscroll-behavior-x":"none"}` |
| `overscroll-y-auto` | `{"overscroll-behavior-y":"auto"}` |
| `overscroll-y-contain` | `{"overscroll-behavior-y":"contain"}` |
| `overscroll-y-none` | `{"overscroll-behavior-y":"none"}` |

### Backgrounds

| Utility | Description |
| --- | --- |
| `bg-auto` | `{"background-size":"auto"}` |
| `bg-cover` | `{"background-size":"cover"}` |
| `bg-contain` | `{"background-size":"contain"}` |
| `bg-no-repeat` | `{"background-repeat":"no-repeat"}` |
| `bg-fixed` | `{"background-attachment":"fixed"}` |
| `bg-local` | `{"background-attachment":"local"}` |
| `bg-scroll` | `{"background-attachment":"scroll"}` |

### Lists

| Utility | Description |
| --- | --- |
| `list-none` | `{"list-style-type":"none"}` |
| `list-disc` | `{"list-style-type":"disc"}` |
| `list-decimal` | `{"list-style-type":"decimal"}` |

### Vertical Alignment

| Utility | Description |
| --- | --- |
| `align-baseline` | `{"vertical-align":"baseline"}` |
| `align-top` | `{"vertical-align":"top"}` |
| `align-middle` | `{"vertical-align":"middle"}` |
| `align-bottom` | `{"vertical-align":"bottom"}` |
| `align-text-top` | `{"vertical-align":"text-top"}` |
| `align-text-bottom` | `{"vertical-align":"text-bottom"}` |

### Viewport Sizing

| Utility | Description |
| --- | --- |
| `min-h-screen` | `{"min-height":"100vh"}` |
| `max-h-screen` | `{"max-height":"100vh"}` |
| `min-w-screen` | `{"min-width":"100vw"}` |
| `h-dvh` | `{"height":"100dvh"}` |
| `h-svh` | `{"height":"100svh"}` |
| `h-lvh` | `{"height":"100lvh"}` |
| `w-dvw` | `{"width":"100dvw"}` |
| `w-svw` | `{"width":"100svw"}` |
| `w-lvw` | `{"width":"100lvw"}` |
| `min-h-dvh` | `{"min-height":"100dvh"}` |
| `min-h-svh` | `{"min-height":"100svh"}` |
| `min-h-lvh` | `{"min-height":"100lvh"}` |

### Accessibility

| Utility | Description |
| --- | --- |
| `sr-only` | `{"position":"absolute","width":"1px","height":"1px","padding":"0","margin":"-1px","overflow":"hidden","clip":"rect(0, 0, 0, 0)","white-space":"nowrap","border-width":"0"}` |
| `not-sr-only` | `{"position":"static","width":"auto","height":"auto","padding":"0","margin":"0","overflow":"visible","clip":"auto","white-space":"normal"}` |

### Other Utilities

| Utility | Description |
| --- | --- |
| `no-underline` | `{"text-decoration":"none"}` |
| `grid` | `{"display":"grid"}` |
| `box-border` | `{"box-sizing":"border-box"}` |
| `box-content` | `{"box-sizing":"content-box"}` |
| `text-{0-99}px` | Font size in pixels (e.g., `text-12px`, `text-16px`) |
| `text-{0-24.75}rem` | Font size in rem units (0.25rem increments) |

--- 

*Generated automatically from `src/css_gen_utils.ts`*
