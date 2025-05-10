import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

async function loadData() {
  const data = await d3.csv("loc.csv", (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: "https://github.com/vis-society/lab-7/commit/" + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, "lines", {
        value: lines,
        // What other options do we need to set?
        // Hint: look up configurable, writable, and enumerable
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  // Create the dl element
  const dl = d3.select("#stats").append("dl").attr("class", "stats");

  // Add total LOC
  dl.append("dt").html('Total <abbr title="Lines of code">LOC</abbr>:');
  dl.append("dd").text(data.length);

  // Add total commits
  dl.append("dt").text("Total commits:");
  dl.append("dd").text(commits.length);

  // Add more stats as needed...

  //number of files in codebase
  dl.append("dt").text("Files in codebase:");
  dl.append("dd").text(d3.group(data, (d) => d.file).size);

  //majority day of week

  dl.append("dt").text("Most common workday of week:");
  const weekdayCounts = d3.rollup(
    data,
    (v) => v.length,
    (d) => d.date.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  );

  const weekdayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const majorityWeekday = Array.from(weekdayCounts.entries()).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0]; // getDay index

  const majorityWeekdayName = weekdayNames[majorityWeekday];
  dl.append("dd").text(majorityWeekdayName);

  //majority time of day
  dl.append("dt").text("Majority Time of Day:");
  const hourCounts = d3.rollup(
    data,
    (v) => v.length,
    (d) => {
      const hour = d.datetime.getHours();
      if (hour >= 8 && hour < 13) return "Morning";
      if (hour >= 13 && hour < 18) return "Afternoon";
      if (hour >= 18 && hour < 24) return "Night";
      //return "Night";
    }
  );

  const mostWorkPeriod = Array.from(hourCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a
  )[0];

  dl.append("dd").text(mostWorkPeriod);
}

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

  const yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

  const rScale = d3
    .scaleSqrt() // Change only this line
    .domain([minLines, maxLines])
    .range([2, 30]);

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // Update scales with new ranges
  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  // Add gridlines BEFORE the axes
  const gridlines = svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left}, 0)`);

  // Create gridlines as an axis with no labels and full-width ticks
  gridlines.call(
    d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width)
  );

  // Create the axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00");

  // Add X axis
  svg
    .append("g")
    .attr("transform", `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  // Add Y axis
  svg
    .append("g")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  const dots = svg.append("g").attr("class", "dots");

  dots
    .selectAll("circle")
    .data(commits)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", 5)
    .attr("fill", "steelblue")
    .attr("r", (d) => rScale(d.totalLines))
    .style("fill-opacity", 0.7) // Add transparency for overlapping dots
    .on("mouseenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });
}

let data = await loadData();
let commits = processCommits(data);

renderScatterPlot(data, commits);

function renderTooltipContent(commit) {
  const link = document.getElementById("commit-link");
  const date = document.getElementById("commit-date");

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString("en", {
    dateStyle: "full",
  });
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

//let data = await loadData();
//let commits = processCommits(data);
//console.log(commits);

renderCommitInfo(data, commits);
