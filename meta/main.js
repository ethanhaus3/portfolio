import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale;
let yScale;

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

  const dl = d3.select("#stats").select("dl");
  if (!dl.empty()) {
    dl.remove();
  }
  // Create the dl element
  const newdl = d3.select("#stats").append("dl").attr("class", "stats");

  // Add total LOC
  newdl.append("dt").html('Total <abbr title="Lines of code">LOC</abbr>:');
  newdl.append("dd").text(data.length);

  // Add total commits
  newdl.append("dt").text("Total commits:");
  newdl.append("dd").text(commits.length);

  // Add more stats as needed...

  //number of files in codebase
  newdl.append("dt").text("Files in codebase:");
  newdl.append("dd").text(d3.group(data, (d) => d.file).size);

  //majority day of week

  newdl.append("dt").text("Most common workday of week:");
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
  newdl.append("dd").text(majorityWeekdayName);

  //majority time of day
  newdl.append("dt").text("Majority Time of Day:");
  const hourCounts = d3.rollup(
    data,
    (v) => v.length,
    (d) => {
      const hour = d.datetime.getHours();
      if (hour >= 8 && hour < 13) return "Morning";
      if (hour >= 13 && hour < 18) return "Afternoon";
      if (hour >= 18 && hour < 24) return "Night";
      return "Night";
    }
  );

  

  const mostWorkPeriod = Array.from(hourCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a
  )[0];

  newdl.append("dd").text(mostWorkPeriod);
}

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

  yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

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
    .attr('class', 'x-axis')
    .call(xAxis);

  // Add Y axis
  svg
    .append("g")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis')
    .call(yAxis);

  const dots = svg.append("g").attr("class", "dots");

  dots
    .selectAll("circle")
    .data(sortedCommits, (d) => d.id)
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

function createBrushSelector(svg) {
  svg.call(d3.brush());
  svg.selectAll(".dots, .overlay ~ *").raise();
}



function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }
  const [x0, x1] = selection.map((d) => d[0]);
  const [y0, y1] = selection.map((d) => d[1]);
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;

  // TODO: return true if commit is within brushSelection
  // and false if not
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}

let data = await loadData();
let commits = processCommits(data);

renderScatterPlot(data, commits);

//let data = await loadData();
//let commits = processCommits(data);
//console.log(commits);
createBrushSelector(d3.select('#chart').select('svg'));
d3.select("#chart").select("svg").call(d3.brush().on('start brush end', brushed));
renderCommitInfo(data, commits);

let commitProgress = 100;

let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);

let filteredCommits = commits;

let lines = filteredCommits.flatMap((d) => d.lines);
let files = d3
  .groups(lines, (d) => d.file)
  .map(([name, lines]) => {
    return { name, lines };
  });

let filesContainer = d3
  .select('#files')
  .selectAll('div')
  .data(files, (d) => d.name)
  .join(
    // This code only runs when the div is initially rendered
    (enter) =>
      enter.append('div').call((div) => {
        div.append('dt').append('code');
        div.append('dd');
      }),
      
  );
  

// This code updates the div info
filesContainer.select('dt > code').text((d) => d.name);
filesContainer.select('dd').text((d) => `${d.lines.length} lines`);











function onTimeSliderChange() {

  const sliderScale = d3.scaleTime()
  .domain(d3.extent(commits, d => d.datetime))  // same domain
  .range([0, 100]);

  const slider = document.getElementById("commit-progress");
  const timeElem = document.getElementById("commit-time");
  const anyTimeElem = document.getElementById("any-time");

  
  //getting slider value
  commitProgress = +slider.value;

  if (commitProgress < 0) {
    timeElem.style.display = "none";
    anyTimeElem.style.display = "block";
    return;
  }

  //invert value to get datetime
  commitMaxTime = sliderScale.invert(commitProgress);

  //update time element
  timeElem.textContent = commitMaxTime.toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
  timeElem.style.display = 'inline';
  anyTimeElem.style.display = 'none';

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);

  const filteredLines = filteredCommits.flatMap((d) => d.lines);
  renderCommitInfo(filteredLines, filteredCommits);
  }

  document.getElementById("commit-progress").addEventListener("input", onTimeSliderChange);
  onTimeSliderChange(); //initialize display on load
  console.log(d3.extent(commits, d => d.datetime));

  function updateScatterPlot(commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
    };
  
    const svg = d3.select('#chart').select('svg');
  
    xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));
  
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);
  
    //const xAxis = d3.axisBottom(xScale);
    const xAxisGroup = svg.select('g.x-axis');
    xAxisGroup.selectAll('*').remove();
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
      .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00");

    //xAxisGroup.call(xAxis);
    xAxisGroup.transition().duration(500).call(xAxis);

  
    //svg
      //.append('g')
      //.attr('transform', `translate(0, ${usableArea.bottom})`)
      //.attr('class', 'x-axis') // new line to mark the g tag
      //.call(xAxis);
    
    svg
      .append('g')
      .attr('transform', `translate(${usableArea.left}, 0)`)
      //.attr('class', 'y-axis') // just for consistency
      .call(yAxis);

    const dots = svg.select('g.dots');
  
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    dots
      .selectAll('circle')
      .data(sortedCommits, (d) => d.id)
      .join('circle')
      .attr('cx', (d) => xScale(d.datetime))
      .attr('cy', (d) => yScale(d.hourFrac))
      .attr('r', (d) => rScale(d.totalLines))
      .attr('fill', 'steelblue')
      .style('fill-opacity', 0.7) // Add transparency for overlapping dots
      .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
      });
  }

  function updateFileDisplay(commits){
    const lines = commits.flatMap((d) => d.lines);

    let colors = d3.scaleOrdinal(d3.schemeTableau10);


    let files = d3
      .groups(lines, (d) => d.file)
      .map(([name, lines]) => {
        return { name, lines };
      })
      .sort((a, b) => b.lines.length - a.lines.length);

      

    let filesContainer = d3
      .select('#files')
      .selectAll('div')
      .data(files, (d) => d.name)
      .join(
        (enter) =>
          enter.append('div').call((div) => {
            div.append('dt').append('code');
            div.append('dd');
          }),
        (update) => update,
        (exit) => exit.remove()
      );

    filesContainer.select('dt > code').text((d) => d.name);
    filesContainer.select('dd').text((d) => `${d.lines.length} lines`);

    // append one div for each line
    filesContainer
      .select('dd')
      .selectAll('div')
      .data((d) => d.lines)
      .join('div')
      .attr('class', 'loc')
      .attr('style', (d) => `--color: ${colors(d.type)}`);

  }

  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html(
      (d, i) => `
		              On ${d.datetime.toLocaleString('en', {
        dateStyle: 'full',
        timeStyle: 'short',
      })},
		              I made <a href="${d.url}" target="_blank">${
        i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
      }</a>.
		              I edited ${d.totalLines} lines across ${
        d3.rollups(
          d.lines,
          (D) => D.length,
          (d) => d.file,
        ).length
      } files.
		              Then I looked over all I had made, and I saw that it was very good.
	        `,
  );

  function onStepEnter(response) {
    // Get the commit data attached to the step element
    const currentCommit = response.element.__data__;
    const currentDate = currentCommit.datetime;
  
    // Add active class to current step
    d3.selectAll(".step").classed("is-active", false);
    d3.select(response.element).classed("is-active", true);
  
    // Filter commits up to this date
    filteredCommits = commits.filter((d) => d.datetime <= currentDate);
  
    // Update visualizations
    updateScatterPlot(data, filteredCommits);
    updateCommitInfo(data, filteredCommits);
    document.querySelector(
      "#selection-count"
    ).textContent = `${filteredCommits.length} commits shown`;
    renderLanguageBreakdown(null);
    updateFileDisplay(filteredCommits);
  
    // Update the slider position to match
    const sliderValue = timeScale(currentDate);
    document.getElementById("commit-progress").value = sliderValue;
  
    // Update the time display
    const date = currentDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const time = currentDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    document.getElementById("commit-time").textContent = `${date} at ${time}`;
  }
  
  const scroller = scrollama();
  scroller
    .setup({
      container: "#scrolly-1",
      step: "#scrolly-1 .step",
    })
    .onStepEnter(onStepEnter)
    .onStepExit((response) => {
      // Remove the active class when exiting a step
      d3.select(response.element).classed("is-active", false);
    });




