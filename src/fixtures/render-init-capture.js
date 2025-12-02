// This module captures the renderer state when :render executes.
// Used to test the order of :render vs :data execution.
export default function (elem, renderer) {
  // Store what we could access at init time on the element for later inspection.
  elem._initState = {
    // Try to access a variable that should come from :data on the same element.
    chartType: renderer.$.chartType,
    hasChartType: renderer.has("chartType"),
    // Also check $parent access for inherited variables.
    parentVar: renderer.$.$parent?.$.inheritedVar,
  };
}
