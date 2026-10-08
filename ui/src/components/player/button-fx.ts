/** Small "pop" feedback for player controls: a slight grow on hover, a quick
 * squash while pressed, then a springy overshoot back to normal on release.
 * Disabled buttons (pointer-events-none) never trigger it; users who prefer
 * reduced motion get none. */
export const playerButtonFx =
  "transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-90 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
