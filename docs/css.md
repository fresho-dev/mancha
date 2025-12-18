# CSS Documentation

Mancha provides a set of CSS utilities and basic styles to help you build your application.

## Basic CSS

The basic CSS rules provide a clean, readable default style for standard HTML elements. You can inject them using `injectBasicCss()` or by adding `css="basic"` to your script tag.

### Reset & Defaults

- **Max Width**: 70ch (centered)
- **Padding**: 2em 1em
- **Line Height**: 1.75
- **Font Family**: sans-serif
- **H1-H6 Margin**: 1em 0 0.5em
- **P, UL, OL Margin Bottom**: 1em

## Utility CSS

The utility CSS rules are inspired by Tailwind CSS. You can inject them using `injectUtilsCss()` or by adding `css="utils"` to your script tag.

### Media Breakpoints

| Prefix | Min Width |
| ------ | --------- |
| `sm:`  | `640px`   |
| `md:`  | `768px`   |
| `lg:`  | `1024px`  |
| `xl:`  | `1280px`  |

### Pseudo States

The following pseudo states are supported for all utilities:

- `hover:`
- `focus:`
- `disabled:`
- `active:`

### Spacing (Margin & Padding)

Spacing utilities use a 0.25rem (4px) unit by default.

| Prefix | Property             | Values                                            |
| ------ | -------------------- | ------------------------------------------------- |
| `m-`   | `margin`             | `0`, `0.25rem` - `128rem` (and negative versions) |
| `mx-`  | `margin-left/right`  | Same as above                                     |
| `my-`  | `margin-top/bottom`  | Same as above                                     |
| `mt-`  | `margin-top`         | Same as above                                     |
| `mb-`  | `margin-bottom`      | Same as above                                     |
| `ml-`  | `margin-left`        | Same as above                                     |
| `mr-`  | `margin-right`       | Same as above                                     |
| `p-`   | `padding`            | `0`, `0.25rem` - `128rem` (and negative versions) |
| `px-`  | `padding-left/right` | Same as above                                     |
| `py-`  | `padding-top/bottom` | Same as above                                     |
| `pt-`  | `padding-top`        | Same as above                                     |
| `pb-`  | `padding-bottom`     | Same as above                                     |
| `pl-`  | `padding-left`       | Same as above                                     |
| `pr-`  | `padding-right`      | Same as above                                     |

### Sizing (Width & Height)

| Prefix                      | Property           | Values                                                                              |
| --------------------------- | ------------------ | ----------------------------------------------------------------------------------- |
| `w-`                        | `width`            | `0`, `full` (100%), `screen` (100vw/vh), `auto`, `px`, `0.25rem` - `128rem`         |
| `w-dvw/dvh/svw/svh/lvw/lvh` | `width`            | Viewport-relative units                                                             |
| `w-fit/min/max`             | `width`            | `fit-content`, `min-content`, `max-content`                                         |
| `h-`                        | `height`           | `0`, `full` (100%), `screen` (100vw/vh), `auto`, `px`, `0.25rem` - `128rem`         |
| `h-dvw/dvh/svw/svh/lvw/lvh` | `height`           | Viewport-relative units                                                             |
| `h-fit/min/max`             | `height`           | `fit-content`, `min-content`, `max-content`                                         |
| `min-w-`                    | `min-width`        | Same as sizing                                                                      |
| `min-h-`                    | `min-height`       | Same as sizing                                                                      |
| `max-w-`                    | `max-width`        | Same as sizing                                                                      |
| `max-h-`                    | `max-height`       | Same as sizing                                                                      |
| `size-`                     | `width` & `height` | `auto`, `px`, `full`, `dvw`, `dvh`, `svw`, `svh`, `lvw`, `lvh`, `min`, `max`, `fit` |

### Colors

Supported prefixes: `text-`, `bg-`, `border-`, `fill-`.

| Color                           | Shades                                                              |
| ------------------------------- | ------------------------------------------------------------------- |
| `white`, `black`, `transparent` | N/A                                                                 |
| `red`                           | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `pink`                          | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `purple`                        | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `deep-purple`                   | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `indigo`                        | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `blue`                          | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `light-blue`                    | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `cyan`                          | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `teal`                          | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `green`                         | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `light-green`                   | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `lime`                          | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `yellow`                        | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `amber`                         | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `orange`                        | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `deep-orange`                   | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `brown`                         | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `gray`                          | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |
| `blue-gray`                     | `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` |

### Borders & Corners

| Utility           | Description                      |
| ----------------- | -------------------------------- |
| `border`          | `{"border":"1px solid"}`         |
| `border-none`     | `{"border":"none"}`              |
| `border-solid`    | `{"border-style":"solid"}`       |
| `border-dashed`   | `{"border-style":"dashed"}`      |
| `border-dotted`   | `{"border-style":"dotted"}`      |
| `border-collapse` | `{"border-collapse":"collapse"}` |
| `rounded-none`    | `{"border-radius":"0"}`          |
| `rounded`         | `{"border-radius":".25rem"}`     |
| `rounded-sm`      | `{"border-radius":".125rem"}`    |
| `rounded-md`      | `{"border-radius":".375rem"}`    |
| `rounded-lg`      | `{"border-radius":".5rem"}`      |
| `rounded-xl`      | `{"border-radius":".75rem"}`     |
| `rounded-full`    | `{"border-radius":"9999px"}`     |

### Shadows & Effects

| Utility          | Description                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `shadow`         | `{"box-shadow":"0 0 1px 0 rgba(0, 0, 0, 0.05)"}`                                             |
| `shadow-sm`      | `{"box-shadow":"0 1px 2px 0 rgba(0, 0, 0, 0.05)"}`                                           |
| `shadow-md`      | `{"box-shadow":"0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"}`     |
| `shadow-lg`      | `{"box-shadow":"0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"}`   |
| `shadow-xl`      | `{"box-shadow":"0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"}` |
| `shadow-2xl`     | `{"box-shadow":"0 25px 50px -12px rgba(0, 0, 0, 0.25)"}`                                     |
| `shadow-inner`   | `{"box-shadow":"inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)"}`                                     |
| `shadow-outline` | `{"box-shadow":"0 0 0 3px rgba(66, 153, 225, 0.5)"}`                                         |
| `shadow-none`    | `{"box-shadow":"none"}`                                                                      |

### Transitions & Animations

| Utility           | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `transition-none` | `{"transition":"none"}`                                          |
| `transition`      | `{"transition":"all 150ms ease-in-out"}`                         |
| `animate-none`    | `{"animation":"none"}`                                           |
| `animate-spin`    | `{"animation":"spin 1s linear infinite"}`                        |
| `animate-ping`    | `{"animation":"ping 1s cubic-bezier(0, 0, 0.2, 1) infinite"}`    |
| `animate-pulse`   | `{"animation":"pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"}` |

### Interactivity

| Utility               | Description                 |
| --------------------- | --------------------------- |
| `cursor-pointer`      | `{"cursor":"pointer"}`      |
| `cursor-wait`         | `{"cursor":"wait"}`         |
| `cursor-not-allowed`  | `{"cursor":"not-allowed"}`  |
| `select-none`         | `{"user-select":"none"}`    |
| `select-all`          | `{"user-select":"all"}`     |
| `pointer-events-auto` | `{"pointer-events":"auto"}` |
| `pointer-events-none` | `{"pointer-events":"none"}` |
| `resize`              | `{"resize":"both"}`         |
| `resize-x`            | `{"resize":"horizontal"}`   |
| `resize-y`            | `{"resize":"vertical"}`     |
| `resize-none`         | `{"resize":"none"}`         |

### Typography

| Utility                   | Description                                                               |
| ------------------------- | ------------------------------------------------------------------------- |
| `font-mono`               | `{"font-family":"monospace"}`                                             |
| `font-sans`               | `{"font-family":"sans-serif"}`                                            |
| `font-serif`              | `{"font-family":"serif"}`                                                 |
| `font-cursive`            | `{"font-family":"cursive"}`                                               |
| `text-xs`                 | `{"font-size":".75rem","line-height":"calc(1 / 0.75)"}`                   |
| `text-sm`                 | `{"font-size":".875rem","line-height":"calc(1.25 / 0.875)"}`              |
| `text-base`               | `{"font-size":"1rem","line-height":"calc(1.5 / 1)"}`                      |
| `text-lg`                 | `{"font-size":"1.125rem","line-height":"calc(1.75 / 1.125)"}`             |
| `text-xl`                 | `{"font-size":"1.25rem","line-height":"calc(1.75 / 1.25)"}`               |
| `text-2xl`                | `{"font-size":"1.5rem","line-height":"calc(2 / 1.5)"}`                    |
| `text-3xl`                | `{"font-size":"1.875rem","line-height":"calc(2.25 / 1.875)"}`             |
| `text-4xl`                | `{"font-size":"2.25rem","line-height":"calc(2.5 / 2.25)"}`                |
| `text-5xl`                | `{"font-size":"3rem","line-height":"1"}`                                  |
| `text-6xl`                | `{"font-size":"3.75rem","line-height":"1"}`                               |
| `text-7xl`                | `{"font-size":"4.5rem","line-height":"1"}`                                |
| `font-thin`               | `{"font-weight":100}`                                                     |
| `font-extralight`         | `{"font-weight":200}`                                                     |
| `font-light`              | `{"font-weight":300}`                                                     |
| `font-normal`             | `{"font-weight":400}`                                                     |
| `font-medium`             | `{"font-weight":500}`                                                     |
| `font-semibold`           | `{"font-weight":600}`                                                     |
| `font-bold`               | `{"font-weight":700}`                                                     |
| `font-extrabold`          | `{"font-weight":800}`                                                     |
| `font-black`              | `{"font-weight":900}`                                                     |
| `italic`                  | `{"font-style":"italic"}`                                                 |
| `not-italic`              | `{"font-style":"normal"}`                                                 |
| `tracking-tighter`        | `{"letter-spacing":"-0.05em"}`                                            |
| `tracking-tight`          | `{"letter-spacing":"-0.025em"}`                                           |
| `tracking-normal`         | `{"letter-spacing":"0"}`                                                  |
| `tracking-wide`           | `{"letter-spacing":"0.025em"}`                                            |
| `tracking-wider`          | `{"letter-spacing":"0.05em"}`                                             |
| `tracking-widest`         | `{"letter-spacing":"0.1em"}`                                              |
| `leading-none`            | `{"line-height":"1"}`                                                     |
| `leading-tight`           | `{"line-height":"1.25"}`                                                  |
| `leading-snug`            | `{"line-height":"1.375"}`                                                 |
| `leading-normal`          | `{"line-height":"1.5"}`                                                   |
| `leading-relaxed`         | `{"line-height":"1.625"}`                                                 |
| `leading-loose`           | `{"line-height":"2"}`                                                     |
| `text-left`               | `{"text-align":"left"}`                                                   |
| `text-right`              | `{"text-align":"right"}`                                                  |
| `text-center`             | `{"text-align":"center"}`                                                 |
| `text-justify`            | `{"text-align":"justify"}`                                                |
| `underline`               | `{"text-decoration":"underline"}`                                         |
| `decoration-none`         | `{"text-decoration":"none"}`                                              |
| `line-through`            | `{"text-decoration":"line-through"}`                                      |
| `uppercase`               | `{"text-transform":"uppercase"}`                                          |
| `lowercase`               | `{"text-transform":"lowercase"}`                                          |
| `capitalize`              | `{"text-transform":"capitalize"}`                                         |
| `truncate`                | `{"white-space":"nowrap","overflow":"hidden","text-overflow":"ellipsis"}` |
| `text-elipsis`            | `{"text-overflow":"ellipsis"}`                                            |
| `text-clip`               | `{"text-overflow":"clip"}`                                                |
| `text-wrap`               | `{"text-wrap":"wrap"}`                                                    |
| `text-nowrap`             | `{"text-wrap":"nowrap"}`                                                  |
| `text-balance`            | `{"text-wrap":"balance"}`                                                 |
| `text-pretty`             | `{"text-wrap":"pretty"}`                                                  |
| `whitespace-normal`       | `{"white-space":"normal"}`                                                |
| `whitespace-nowrap`       | `{"white-space":"nowrap"}`                                                |
| `whitespace-pre`          | `{"white-space":"pre"}`                                                   |
| `whitespace-pre-line`     | `{"white-space":"pre-line"}`                                              |
| `whitespace-pre-wrap`     | `{"white-space":"pre-wrap"}`                                              |
| `whitespace-break-spaces` | `{"white-space":"break-spaces"}`                                          |

### Flexbox & Layout

| Utility             | Description                           |
| ------------------- | ------------------------------------- |
| `flex`              | `{"display":"flex"}`                  |
| `flex-1`            | `{"flex":"1 1 0%"}`                   |
| `flex-inline`       | `{"display":"inline-flex"}`           |
| `flex-row`          | `{"flex-direction":"row"}`            |
| `flex-col`          | `{"flex-direction":"column"}`         |
| `flex-row-reverse`  | `{"flex-direction":"row-reverse"}`    |
| `flex-col-reverse`  | `{"flex-direction":"column-reverse"}` |
| `flex-wrap`         | `{"flex-wrap":"wrap"}`                |
| `flex-wrap-reverse` | `{"flex-wrap":"wrap-reverse"}`        |
| `flex-nowrap`       | `{"flex-wrap":"nowrap"}`              |
| `justify-start`     | `{"justify-content":"flex-start"}`    |
| `justify-end`       | `{"justify-content":"flex-end"}`      |
| `justify-center`    | `{"justify-content":"center"}`        |
| `justify-between`   | `{"justify-content":"space-between"}` |
| `justify-around`    | `{"justify-content":"space-around"}`  |
| `justify-evenly`    | `{"justify-content":"space-evenly"}`  |
| `justify-stretch`   | `{"justify-content":"stretch"}`       |
| `items-start`       | `{"align-items":"flex-start"}`        |
| `items-end`         | `{"align-items":"flex-end"}`          |
| `items-center`      | `{"align-items":"center"}`            |
| `items-stretch`     | `{"align-items":"stretch"}`           |
| `flex-grow`         | `{"flex-grow":1}`                     |
| `flex-shrink`       | `{"flex-shrink":1}`                   |
| `flex-none`         | `{"flex":"none"}`                     |
| `flex-auto`         | `{"flex":"1 1 auto"}`                 |
| `flex-initial`      | `{"flex":"0 1 auto"}`                 |
| `grow`              | `{"flex-grow":"1"}`                   |
| `grow-0`            | `{"flex-grow":"0"}`                   |
| `shrink`            | `{"flex-shrink":"1"}`                 |
| `shrink-0`          | `{"flex-shrink":"0"}`                 |
| `self-auto`         | `{"align-self":"auto"}`               |
| `self-start`        | `{"align-self":"flex-start"}`         |
| `self-end`          | `{"align-self":"flex-end"}`           |
| `self-center`       | `{"align-self":"center"}`             |
| `self-stretch`      | `{"align-self":"stretch"}`            |
| `self-baseline`     | `{"align-self":"baseline"}`           |
| `content-normal`    | `{"align-content":"normal"}`          |
| `content-start`     | `{"align-content":"flex-start"}`      |
| `content-end`       | `{"align-content":"flex-end"}`        |
| `content-center`    | `{"align-content":"center"}`          |
| `content-between`   | `{"align-content":"space-between"}`   |
| `content-around`    | `{"align-content":"space-around"}`    |
| `content-evenly`    | `{"align-content":"space-evenly"}`    |
| `content-stretch`   | `{"align-content":"stretch"}`         |
| `items-baseline`    | `{"align-items":"baseline"}`          |

### Position & Inset

| Utility          | Description                      |
| ---------------- | -------------------------------- |
| `relative`       | `{"position":"relative"}`        |
| `fixed`          | `{"position":"fixed"}`           |
| `absolute`       | `{"position":"absolute"}`        |
| `sticky`         | `{"position":"sticky"}`          |
| `object-contain` | `{"object-fit":"contain"}`       |
| `object-cover`   | `{"object-fit":"cover"}`         |
| `object-fill`    | `{"object-fit":"fill"}`          |
| `object-none`    | `{"object-fit":"none"}`          |
| `z-auto`         | `{"z-index":"auto"}`             |
| `inset-0`        | `{"inset":"0"}`                  |
| `inset-auto`     | `{"inset":"auto"}`               |
| `inset-x-0`      | `{"left":"0","right":"0"}`       |
| `inset-y-0`      | `{"top":"0","bottom":"0"}`       |
| `inset-x-auto`   | `{"left":"auto","right":"auto"}` |
| `inset-y-auto`   | `{"top":"auto","bottom":"auto"}` |

### Other Utilities

| Utility        | Description                    |
| -------------- | ------------------------------ |
| `no-underline` | `{"text-decoration":"none"}`   |
| `box-border`   | `{"box-sizing":"border-box"}`  |
| `box-content`  | `{"box-sizing":"content-box"}` |

---

_Generated automatically from `src/css_gen_utils.ts`_
