import styled from "styled-components";

const SessionPage = styled.div`
  width: 100%;
  max-width: 43rem;
  min-height: 100dvh;
  margin: 0 auto;
  padding: calc(2.4rem + env(safe-area-inset-top)) 3rem
    calc(3rem + env(safe-area-inset-bottom));
  background: var(--background);
  box-shadow: 0 0 6rem #26372508;

  &.lobby-page {
    position: relative;
    isolation: isolate;
    height: 100dvh;
    min-height: 100dvh;
    overflow: hidden;
    display: block;
    padding: 0;
    background: #f0ffd1;
    box-shadow: none;
  }
  &.lobby-page::before {
    position: absolute;
    z-index: 1;
    inset: 0;
    background: linear-gradient(
      180deg,
      #f2ffda58 0%,
      #dfff7552 54%,
      #edffc370 100%
    );
    content: "";
    pointer-events: none;
  }
  &.lobby-page > .wait-background {
    position: absolute;
    z-index: 0;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
  &.conversation-page {
    display: flex;
    height: 100dvh;
    overflow: hidden;
    flex-direction: column;
  }
  &.vote-page {
    display: flex;
    height: 100dvh;
    min-height: 100dvh;
    overflow: hidden;
    flex-direction: column;
    padding: calc(2.4rem + env(safe-area-inset-top)) 3rem
      calc(1.2rem + env(safe-area-inset-bottom));
  }

  .session-header {
    display: grid;
    grid-template-columns: 4rem 1fr auto;
    align-items: center;
    gap: 1rem;
  }
  .entry-header {
    grid-template-columns: 1fr auto;
    min-height: 4.4rem;
  }
  .entry-header img {
    justify-self: start;
    width: 9rem;
    height: 4rem;
    object-fit: contain;
  }
  .entry-header .home-logo {
    display: flex;
    justify-self: start;
    align-items: center;
  }
  &.lobby-page .session-header {
    position: absolute;
    z-index: 3;
    top: calc(2.4rem + env(safe-area-inset-top));
    right: 3rem;
    left: 3rem;
    grid-template-columns: 1fr auto 1fr;
    min-height: 4.4rem;
    gap: 0.8rem;
  }
  .lobby-header h1 {
    margin: 0;
    color: #00111f;
    font: 700 2.2rem/1 var(--display-font);
    text-align: center;
  }
  .conversation-header {
    grid-template-columns: 1fr auto 1fr;
    min-height: 4.4rem;
    gap: 0.8rem;
  }
  .conversation-header h1 {
    margin: 0;
    color: #00111f;
    font: 400 2.2rem/1 var(--display-font);
    text-align: center;
  }
  .lobby-bell {
    display: grid;
    width: 4.4rem;
    height: 4.4rem;
    place-items: center;
    justify-self: start;
    color: #00111f;
  }
  .lobby-bell svg {
    width: 2.8rem;
    height: 2.8rem;
  }
  .gem-balance {
    display: flex;
    align-items: center;
    justify-self: end;
    gap: 0.5rem;
    padding: 0.55rem 0.8rem;
    border: 0.1rem solid #00111f;
    border-radius: 0.7rem;
    background: #ffffffbb;
    color: #00111f;
    font-size: 1.4rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .gem-balance svg {
    width: 1.8rem;
    height: 1.8rem;
    fill: #5bcaff;
    stroke: #138fca;
    stroke-width: 1.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .gem-balance .store-link {
    position: relative;
    display: grid;
    width: 1.8rem;
    height: 1.8rem;
    place-items: center;
    border-radius: 50%;
    background: #ffc93d;
    color: #332400;
    font-size: 0;
    border: 0;
    cursor: pointer;
  }
  .gem-balance .store-link::before,
  .gem-balance .store-link::after {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0.9rem;
    height: 0.2rem;
    border-radius: 999px;
    background: #332400;
    content: "";
    transform: translate(-50%, -50%);
  }
  .gem-balance .store-link::after {
    transform: translate(-50%, -50%) rotate(90deg);
  }
  .back-button {
    width: 4rem;
    height: 4rem;
    border: 0;
    border-radius: 50%;
    background: transparent;
    font-size: 3.2rem;
    line-height: 1;
  }
  .session-header img {
    width: 8rem;
    height: 3.6rem;
    object-fit: contain;
  }
  .connection-indicator {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--text-secondary);
    font-size: 1.1rem;
    white-space: nowrap;
  }
  .connection-indicator i,
  .call-status span {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    background: #aeb5ae;
  }
  .connection-indicator i.online,
  .call-status span.online {
    background: #6cab30;
  }
  main {
    padding-top: 3rem;
  }
  .entry-header + main {
    padding-bottom: 3rem;
  }
  &.conversation-page main.conversation-main {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    padding: 0;
    margin-top: clamp(1rem, 3dvh, 2.8rem);
  }
  &.vote-page main.vote-main {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    padding: clamp(2rem, 4dvh, 4rem) 0 0;
    margin-top: 0;
  }
  .conversation-screen {
    position: relative;
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    align-items: center;
    font-family: var(--display-font);
  }
  .conversation-timer {
    flex: 0 0 auto;
    margin-top: clamp(1.5rem, 5.8dvh, 5.2rem);
    color: #050505;
    text-align: center;
  }
  .conversation-timer p {
    margin-top: 0.4rem;
    font-size: 2rem;
  }
  .conversation-countdown-alert {
    position: absolute;
    z-index: 3;
    top: 19%;
    left: 50%;
    margin: 0;
    color: #e32636;
    font: 700 1.7rem/1.3 var(--font-body);
    text-align: center;
    white-space: nowrap;
    transform: translateX(-50%);
    animation: countdown-blink 1s ease-in-out 3;
  }
  @keyframes countdown-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.15;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .conversation-countdown-alert {
      animation: none;
    }
  }
  .conversation-timer strong {
    display: block;
    margin-top: 0.4rem;
    font-size: clamp(3.8rem, 8dvh, 5.2rem);
    font-weight: 400;
    line-height: 1;
  }
  .conversation-timer strong.is-urgent {
    color: #e32636;
  }
  .conversation-stage {
    position: absolute;
    top: 24%;
    right: 0;
    bottom: 32%;
    left: 0;
    display: flex;
    width: 100%;
    min-height: 0;
    align-items: center;
    justify-content: center;
  }
  .round-start-notice {
    position: absolute;
    z-index: 5;
    top: 51%;
    left: 50%;
    width: max-content;
    max-width: calc(100% - 3.2rem);
    padding: 1.6rem 2.4rem;
    border: 0.1rem solid #e2e9d9;
    border-radius: 2.4rem;
    background: var(--background);
    box-shadow: 0 1.2rem 4rem #0003;
    color: var(--ink);
    font: 600 1.8rem/1.35 var(--display-font);
    text-align: center;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .conversation-character-group {
    display: flex;
    width: min(100%, 32rem);
    max-height: 100%;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }
  .conversation-mascot {
    --mascot-size: clamp(11rem, min(52vw, 22dvh), 23rem);
    position: relative;
    z-index: 1;
    display: block;
    flex: 0 1 var(--mascot-size);
    width: var(--mascot-size);
    height: var(--mascot-size);
    max-width: 100%;
    max-height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    transition: filter 180ms ease;
    cursor: pointer;
  }
  .conversation-mascot img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .conversation-mascot.is-speaking {
    filter: drop-shadow(0 0 30px #dcff74);
  }
  .conversation-controls {
    position: absolute;
    right: 0;
    bottom: clamp(0.8rem, 4dvh, 4.2rem);
    left: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    justify-items: center;
    gap: 0.6rem;
  }
  .conversation-control {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: #050505;
    font: 400 1.5rem/1.2 var(--font-body);
    white-space: nowrap;
    cursor: pointer;
    transition: color 160ms ease, transform 160ms ease;
  }
  .conversation-control:active {
    transform: scale(0.97);
  }
  .conversation-control:focus-visible {
    outline: 0.25rem solid #607d2f;
    outline-offset: 0.5rem;
    border-radius: 1rem;
  }
  .control-icon {
    position: relative;
    display: grid;
    width: 10.3rem;
    height: 10.3rem;
    place-items: center;
    border-radius: 50%;
    background: #e0ebd9;
    color: #2b302c;
    border: 0;
    box-shadow: none;
    transition: background 180ms ease, color 180ms ease;
  }
  .control-icon img,
  .control-icon svg {
    display: block;
    width: 4.4rem;
    height: 4.4rem;
    object-fit: contain;
  }
  .control-icon svg {
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2.8;
  }
  .conversation-control.is-muted .control-icon,
  .conversation-control.is-speaker-off .control-icon {
    background: #d2d7d0;
    color: #727a70;
  }
  .conversation-control.is-speaker-off .control-icon img {
    filter: grayscale(1);
    opacity: 0.55;
  }
  .conversation-control.is-mic-on .control-icon,
  .conversation-control.is-speaker-on .control-icon {
    background: #dcff74;
  }
  .report-control .control-icon {
    background: #ff0909;
    color: #fff;
  }
  &.lobby-page main.lobby-main {
    position: absolute;
    /* Keep fixed modal backdrops inside the lobby above the header layer. */
    z-index: 4;
    inset: calc(6.8rem + env(safe-area-inset-top)) 3rem
      calc(1.2rem + env(safe-area-inset-bottom));
    min-height: 0;
    padding: 0;
    overflow: hidden;
    background: transparent;
  }
  .lobby-screen {
    position: absolute;
    isolation: isolate;
    inset: 0;
    min-height: 0;
    overflow: hidden;
    background: transparent;
  }
  .profile-group {
    position: absolute;
    z-index: 2;
    inset: 0;
    pointer-events: none;
  }
  .profile-avatar {
    position: absolute;
    display: grid;
    width: 6rem;
    height: 6rem;
    place-items: center;
    transform: translate(-50%, -50%);
    border: 0.3rem solid #8b6d51;
    border-radius: 50%;
    background: #dfff75;
    box-shadow:
      0 0 0 0.35rem #fbfff1bb,
      0 0.7rem 1.5rem #44280e2b;
    animation: profile-float 4.8s ease-in-out infinite;
  }
  .profile-avatar span {
    color: #44280e;
    font: 700 2.7rem/1 var(--display-font);
  }
  .choice-profile {
    padding: 0;
    color: inherit;
    pointer-events: auto;
    cursor: pointer;
  }
  .heart-modal-backdrop {
    position: fixed;
    z-index: 20;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 2.4rem;
    background: #10161080;
  }
  .heart-modal {
    position: relative;
    display: flex;
    width: min(100%, 34rem);
    max-height: calc(100dvh - 3.2rem);
    flex-direction: column;
    align-items: center;
    overflow-y: auto;
    padding: 3rem 2.4rem 2.4rem;
    border: 0.1rem solid #8b6d51;
    border-radius: 2rem;
    background: #fbfff1;
    box-shadow: 0 1rem 3rem #10161030;
    text-align: center;
  }
  .heart-modal-close {
    position: absolute;
    top: 1rem;
    right: 1.2rem;
    width: 3.2rem;
    height: 3.2rem;
    border: 0;
    background: transparent;
    color: #2b302c;
    font: 400 2.8rem/1 var(--font-body);
    cursor: pointer;
  }
  .heart-profile-round {
    margin-top: 1.6rem;
    color: #899188;
    font: 500 1.4rem/1.4 var(--font-body);
  }
  .heart-modal h2 {
    margin-top: 0.4rem;
    color: #2b302c;
    font: 700 2.4rem/1.3 var(--display-font);
  }
  .heart-balance-summary {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    margin-top: 2rem;
    padding: 1.5rem 1.6rem;
    border-radius: 1.4rem;
    background: #f2f7e7;
    color: #899188;
    font: 400 1.4rem/1.4 var(--font-body);
    text-align: left;
  }
  .heart-balance-summary strong {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    color: #2b302c;
    font-size: 1.8rem;
    font-weight: 700;
  }
  .heart-balance-summary i {
    color: #ff4a78;
    font-size: 2rem;
    font-style: normal;
  }
  .heart-balance-summary .gem-mark {
    color: var(--gem-blue);
  }
  .heart-charge-backdrop {
    z-index: 22;
  }
  .heart-charge-modal h2 {
    margin-top: 0.5rem;
  }
  .heart-charge-modal .heart-profile-round {
    margin-top: 0.8rem;
  }
  .heart-charge-summary {
    display: flex;
    width: 100%;
    flex-direction: column;
    margin-top: 1.8rem;
    padding: 1.5rem 1.6rem;
    border-radius: 1.4rem;
    background: #f2f7e7;
    color: #899188;
    font: 400 1.4rem/1.4 var(--font-body);
    text-align: left;
  }
  .heart-charge-summary-row,
  .heart-charge-quantity-row {
    display: flex;
    min-height: 3.8rem;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .heart-charge-summary-row strong,
  .heart-charge-quantity-row strong {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    color: #2b302c;
    font-size: 1.6rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .heart-charge-summary-row i,
  .heart-charge-quantity-row i {
    color: #ff4a78;
    font-size: 1.8rem;
    font-style: normal;
  }
  .heart-charge-summary-row .gem-mark {
    color: var(--gem-blue);
  }
  .heart-charge-cost-row {
    margin-top: 0.6rem;
    padding-top: 1rem;
    border-top: 1px solid #dce4d2;
    color: #2b302c;
    font-weight: 700;
  }
  .heart-quantity-control {
    display: inline-flex;
    align-items: center;
    gap: 0.9rem;
  }
  .heart-quantity-arrows {
    display: flex;
    flex-direction: row;
    gap: 0.2rem;
  }
  .heart-quantity-arrows button {
    width: 2.4rem;
    height: 1.8rem;
    padding: 0;
    border: 0;
    border-radius: 0.4rem;
    background: #e3ecd6;
    color: #52633a;
    font-size: 0.9rem;
    line-height: 1;
    cursor: pointer;
  }
  .heart-quantity-arrows button:disabled {
    color: #adb5a5;
    cursor: default;
  }
  .heart-send-button,
  .heart-buy-button {
    width: 100%;
    min-height: 4.6rem;
    margin-top: 1.8rem;
    border: 0;
    border-radius: 1.2rem;
    background: var(--green);
    color: #011020;
    font: 600 1.5rem var(--font-body);
    cursor: pointer;
  }
  .heart-send-button:disabled {
    background: #e3e7df;
    color: #8b918a;
    cursor: default;
  }
  .heart-charge-button {
    min-height: 4rem;
    margin-top: 0.9rem;
    padding: 0.6rem;
    border: 0;
    background: transparent;
    color: #66716b;
    font: 500 1.4rem var(--font-body);
    text-decoration: underline;
    cursor: pointer;
  }
  .heart-charge-button:disabled {
    color: #a1a69f;
    cursor: default;
  }
  .heart-buy-button {
    min-height: 4rem;
    margin-top: 0.8rem;
    background: transparent;
    color: #66716b;
    font-size: 1.3rem;
    text-decoration: underline;
  }
  .heart-buy-button:disabled {
    color: #a1a69f;
    cursor: default;
  }
  .same-profiles .profile-avatar {
    background: #eaf2d5;
  }
  .same-profiles .profile-avatar:nth-child(2n) {
    background: #e4d0a9;
  }
  .opposite-profiles .profile-avatar:nth-child(2n) {
    background: #b9d987;
  }
  .opposite-profiles .profile-avatar.own-profile {
    background: #eaf2d5;
    cursor: default;
  }
  .choice-profile.own-profile {
    cursor: default;
  }
  .choice-profile.own-profile:disabled {
    opacity: 1;
  }
  .profile-avatar.own-profile::after {
    position: absolute;
    right: 50%;
    bottom: -0.65rem;
    padding: 0.15rem 0.55rem;
    border-radius: 99rem;
    background: #011020;
    color: #fff;
    content: "나";
    font: 600 0.95rem/1.3 var(--font-body);
    transform: translateX(50%);
  }
  .lobby-mascot {
    --mascot-size: clamp(11rem, min(52vw, 22dvh), 23rem);
    position: absolute;
    z-index: 2;
    top: 51%;
    left: 50%;
    box-sizing: border-box;
    width: var(--mascot-size);
    height: var(--mascot-size);
    padding: 0;
    object-fit: contain;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 1rem 0.55rem #27351b36);
  }
  .gem-balance .gem {
    color: var(--gem-blue);
    font-size: 1.7rem;
    line-height: 1;
  }
  .start-conversation {
    position: absolute;
    z-index: 3;
    bottom: 2.2rem;
    right: 0;
    left: 0;
    display: flex;
    width: 100%;
    padding: 1.3216rem 0;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin: 0;
    border: 0;
    border-radius: 1.3216rem;
    background: #011020;
    color: #fff;
    font: 700 1.6rem var(--display-font);
  }
  .participant-waiting-note {
    position: absolute;
    z-index: 3;
    right: 0.5rem;
    bottom: 7.8rem;
    left: 0.5rem;
    margin: 0 auto;
    color: #89938b;
    font: 400 0.95rem/1.55 var(--font-body);
    text-align: center;
    text-wrap: balance;
  }
  .participant-waiting-note span {
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }
  .start-conversation:disabled {
    opacity: 0.55;
  }
  @keyframes profile-float {
    0%,
    100% {
      translate: 0 0;
    }
    50% {
      translate: 0 -0.9rem;
    }
  }
  .session-intro {
    margin-bottom: 2rem;
  }
  .eyebrow {
    display: block;
    color: #819065;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.1rem;
  }
  .session-intro h1,
  .state-card h1 {
    margin-top: 0.6rem;
    font: 400 2.8rem/1.3 var(--display-font);
  }
  .session-intro p {
    margin-top: 0.8rem;
    color: var(--text-secondary);
    font-size: 1.3rem;
  }
  .lobby-card,
  .state-card,
  .partner-card {
    padding: 2.4rem;
    border: 0.1rem solid #e4e9df;
    border-radius: 2.4rem;
    background: var(--white);
    box-shadow: 0 0.6rem 2rem #2b302c0a;
  }
  .lobby-card {
    text-align: center;
  }
  .lobby-card > img {
    width: 7rem;
    height: 7rem;
    margin: 0 auto 1.4rem;
    object-fit: contain;
  }
  .lobby-card h2,
  .state-card h2,
  .partner-card h2 {
    font: 400 2.1rem/1.4 var(--display-font);
  }
  .lobby-card p,
  .state-card p {
    margin-top: 0.8rem;
    color: var(--text-secondary);
    font-size: 1.3rem;
    line-height: 1.7;
  }
  .entry-countdown {
    display: block;
    margin: 1.8rem 0 0;
    font-size: 2.8rem;
    letter-spacing: 0.1rem;
  }
  .primary {
    display: grid;
    width: 100%;
    min-height: 4.8rem;
    place-items: center;
    margin-top: 2rem;
    border: 0;
    border-radius: 1.2rem;
    background: var(--green);
    color: var(--ink);
    font: 600 1.5rem var(--font-body);
    text-decoration: none;
  }
  .primary:disabled {
    background: var(--control-disabled);
    color: var(--text-placeholder);
  }
  .state-card {
    text-align: center;
  }
  .wait-background {
    position: absolute;
    z-index: 0;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
  .state-card .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .state-card .actions button,
  .state-card > button:not(.primary) {
    min-height: 4.4rem;
    margin-top: 2rem;
    padding: 1rem;
    border: 0.1rem solid #e3e8df;
    border-radius: 1.2rem;
    background: var(--white);
    font-size: 1.3rem;
  }
  .partner-card {
    text-align: center;
  }
  .partner-avatar {
    display: grid;
    width: 9rem;
    height: 9rem;
    place-items: center;
    margin: 0 auto 1.6rem;
    border-radius: 50%;
    background: var(--green-soft);
  }
  .partner-avatar img {
    width: 7rem;
    height: 7rem;
    object-fit: contain;
  }
  .partner-card h2 {
    margin-top: 0.6rem;
    font-size: 2.4rem;
  }
  .call-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.7rem;
    margin-top: 1rem;
    color: var(--text-secondary);
    font-size: 1.2rem;
  }
  .compatibility {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    margin-top: 2rem;
    padding: 1.3rem 1.5rem;
    border-radius: 1.5rem;
    background: #f2f7e7;
    text-align: left;
  }
  .compatibility strong {
    color: #66852b;
    font-size: 2.5rem;
  }
  .compatibility small {
    margin-left: 0.2rem;
    font-size: 1.1rem;
  }
  .compatibility p {
    color: var(--text-secondary);
    font-size: 1.2rem;
  }
  .profile-details {
    display: grid;
    gap: 0.8rem;
    margin-top: 1.6rem;
    text-align: left;
  }
  .profile-details p {
    display: grid;
    grid-template-columns: 5rem 1fr;
    gap: 0.8rem;
    color: var(--ink);
    font-size: 1.2rem;
    line-height: 1.5;
  }
  .profile-details p span {
    color: var(--text-secondary);
  }
  .call-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 2rem;
  }
  .call-actions button {
    min-height: 4.5rem;
    border: 0.1rem solid var(--ink);
    border-radius: 1.2rem;
    background: var(--white);
    font: 600 1.3rem var(--font-body);
  }
  .call-actions button.muted {
    background: var(--green);
  }
  .call-actions button.leave {
    border-color: transparent;
    background: var(--ink);
    color: var(--white);
  }
  .voting-card > strong {
    display: block;
    margin-top: 1.8rem;
  }
  .error-message {
    margin-top: 1.4rem;
    color: var(--text-danger);
    font-size: 1.3rem;
    line-height: 1.6;
    text-align: center;
  }

  @media (max-width: 37.4rem) {
    padding-right: 3rem;
    padding-left: 3rem;

    .conversation-stage {
      top: 23%;
      bottom: 31%;
    }
    .conversation-mascot {
      --mascot-size: clamp(11rem, min(54vw, 21dvh), 19rem);
    }
    .lobby-mascot {
      --mascot-size: clamp(11rem, min(54vw, 21dvh), 19rem);
    }
    .conversation-controls {
      gap: 0.2rem;
    }
    .conversation-control {
      gap: 0.7rem;
      font-size: clamp(1.2rem, 3.3vw, 1.5rem);
    }
    .control-icon {
      width: clamp(6rem, 19vw, 8.2rem);
      height: clamp(6rem, 19vw, 8.2rem);
    }
    .control-icon img {
      width: clamp(3.2rem, 10vw, 4.4rem);
      height: clamp(3.2rem, 10vw, 4.4rem);
    }
  }
  @media (max-height: 65rem) {
    .profile-avatar {
      width: 5.2rem;
      height: 5.2rem;
    }
    .start-conversation {
      bottom: 1.2rem;
    }
    .participant-waiting-note {
      bottom: 6.8rem;
    }
    .conversation-timer {
      margin-top: clamp(1.2rem, 4.5dvh, 2.8rem);
    }
    .conversation-timer strong {
      font-size: clamp(3.4rem, 7dvh, 4.6rem);
    }
    .conversation-controls {
      bottom: clamp(0.6rem, 2.5dvh, 2.4rem);
    }
    .control-icon {
      width: clamp(6rem, 18vw, 8.2rem);
      height: clamp(6rem, 18vw, 8.2rem);
    }
    .control-icon img {
      width: 3.8rem;
      height: 3.8rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .wait-background {
      display: none;
    }
    .profile-avatar {
      animation: none;
    }
  }
`;

export default SessionPage;
