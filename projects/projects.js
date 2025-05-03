import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load full project data once
const allProjects = await fetchJSON("../lib/projects.json");
const projectsContainer = document.querySelector('.projects');

// D3 settings
let colors = d3.scaleOrdinal(d3.schemeTableau10);
let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let selectedYear = null;
let query = "";

// Filter logic
function getFilteredProjects() {
  let list = allProjects;
  if (selectedYear) {
    list = list.filter((p) => p.year.toString() === selectedYear);
  }
  if (query) {
    const q = query.toLowerCase();
    list = list.filter((p) =>
      Object.values(p).join(" ").toLowerCase().includes(q)
    );
  }
  return list;
}

// Pie chart rendering
const renderPieChart = (projects) => {
  // Group data by year and count
  let rolledData = d3.rollups(
    projects,
    (v) => v.length,
    (d) => d.year
  );

  let data = rolledData.map(([year, count]) => ({
    value: count,
    label: year,
  }));

  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));

  // Ensure consistent colors across years
  colors.domain(allProjects.map((d) => d.year));

  // Draw arcs
  const svg = d3.select("svg");
  svg.selectAll("path").remove();

  arcs.forEach((arc, idx) => {
    svg
      .append("path")
      .attr("d", arc)
      .attr("fill", colors(arcData[idx].data.label))
      .classed("selected", arcData[idx].data.label === selectedYear)
      .on("click", () => {
        selectedYear =
          selectedYear === arcData[idx].data.label
            ? null
            : arcData[idx].data.label;

        const filtered = getFilteredProjects();
        renderProjects(filtered, projectsContainer, "h2");
        renderPieChart(allProjects);
      });
  });

  // Render legend
  const legend = d3.select('.legend');
  legend.selectAll("li").remove();

  data.forEach((d, idx) => {
    legend
      .append("li")
      .attr("style", `--color:${colors(d.label)}`)
      .classed("selected", d.label === selectedYear)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
};

// Initial render
renderProjects(allProjects, projectsContainer, "h2");
renderPieChart(allProjects);

// Handle search input
const searchInput = document.querySelector('.searchBar');
searchInput.addEventListener("input", (event) => {
  query = event.target.value;
  const filtered = getFilteredProjects();
  renderProjects(filtered, projectsContainer, "h2");
  renderPieChart(filtered);
});
