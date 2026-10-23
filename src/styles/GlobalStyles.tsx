import { createGlobalStyle } from 'styled-components'

export const GlobalStyles = createGlobalStyle`
  @font-face {
    font-family: 'Pretendard';
    src: url('/fonts/PretendardVariable.woff2') format('woff2');
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: 'Jua';
    src: url('/fonts/Jua-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }

  :root {
    font-size: 62.5%;
    font-family: 'Pretendard', sans-serif;
    color: var(--ink);
    background: var(--canvas);
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    --font-body: 'Pretendard', sans-serif;
    --display-font: 'Jua', 'Pretendard', sans-serif;
    --green: #dcff74;
    --ink: #2b302c;
    --background: #fcfffb;
    --canvas: #edf0eb;
    --white: #ffffff;
    --focus: #2b302c;
    --green-soft: #f2ffd1;
    --green-hover: #e4ff9d;
    --green-disabled: #f7fbe9;
    --text-disabled: #adb998;
    --border-card: #98a097;
    --text-secondary: #8b938d;
    --badge-pink: #ffdddd;
    --text-danger: #ee5557;
    --blue: #4293ff;
    --gem-blue: #31bfff;
    --control-disabled: #dedfdf;
    --text-placeholder: #999999;
  }

  * { box-sizing: border-box; }
  body { margin: 0; min-width: 32rem; font-size: 1.6rem; }
  input:not([type='checkbox']):not([type='radio']), select, textarea {
    border-color: #dce3d9;
  }
  input:not([type='checkbox']):not([type='radio']):focus,
  select:focus,
  textarea:focus {
    border-color: var(--ink) !important;
    outline: none !important;
    box-shadow: none !important;
  }
  :focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }
  button { font: inherit; color: inherit; cursor: pointer; }
  button:disabled { cursor: default; }
  button:focus,
  button:focus-visible,
  a:focus-visible,
  [role='button']:focus-visible { outline: none !important; }
  button, a { -webkit-tap-highlight-color: transparent; }
  h1, h2, p { margin: 0; }
  svg { display: block; }
`
