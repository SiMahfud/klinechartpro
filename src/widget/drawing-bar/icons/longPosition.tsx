/**
 * Long Position icon — upward arrow with horizontal entry line
 */

export default () => (
  <svg class="icon-overlay" viewBox="0 0 22 22">
    {/* Entry line */}
    <line x1="4" y1="13" x2="18" y2="13" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.6" />
    {/* Upward arrow body */}
    <line x1="11" y1="18" x2="11" y2="6" stroke="currentColor" stroke-width="1.5" />
    {/* Arrow head */}
    <path d="M7,9.5 L11,4 L15,9.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
    {/* TP area hint */}
    <rect x="4" y="4" width="14" height="9" fill="currentColor" fill-opacity="0.08" rx="1" />
  </svg>
)
