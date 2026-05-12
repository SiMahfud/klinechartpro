/**
 * FRVP (Fixed Range Volume Profile) icon — horizontal histogram bars
 */

export default () => (
  <svg class="icon-overlay" viewBox="0 0 22 22">
    {/* Vertical axis line */}
    <line x1="4" y1="3" x2="4" y2="19" stroke="currentColor" stroke-width="1" stroke-opacity="0.4" />
    {/* Histogram bars — varying widths to represent volume distribution */}
    <rect x="4" y="3.5" width="8" height="1.8" fill="currentColor" fill-opacity="0.5" rx="0.5" />
    <rect x="4" y="6" width="12" height="1.8" fill="currentColor" fill-opacity="0.6" rx="0.5" />
    <rect x="4" y="8.5" width="14" height="1.8" fill="currentColor" fill-opacity="0.9" rx="0.5" />
    <rect x="4" y="11" width="10" height="1.8" fill="currentColor" fill-opacity="0.7" rx="0.5" />
    <rect x="4" y="13.5" width="6" height="1.8" fill="currentColor" fill-opacity="0.4" rx="0.5" />
    <rect x="4" y="16" width="9" height="1.8" fill="currentColor" fill-opacity="0.5" rx="0.5" />
    {/* POC line (Point of Control) */}
    <line x1="4" y1="9.4" x2="19" y2="9.4" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2,1.5" stroke-opacity="0.7" />
  </svg>
)
