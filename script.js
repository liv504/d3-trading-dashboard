let data;
let svg, x, y, zoom, path, xAxis, area, brush;
let width = 928;
let height = 500;
let marginTop = 20;
let marginRight = 30;
let marginBottom = 30;
let marginLeft = 50;



d3.csv("AAPL.csv", d => ({
  date: new Date(d.DATE),
  close: +d["ADJ CLOSE"]
})).then(loadedData => {

  data = loadedData;

  data.sort((a, b) => d3.ascending(a.date, b.date));

  initializeChart();

});


function initializeChart() {

  // Scales
  x = d3.scaleUtc()
    .domain(d3.extent(data, d => d.date))
    .range([marginLeft, width - marginRight]);

  y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.close)])
    .nice()
    .range([height - marginBottom, marginTop]);

  // Area generator
  area = d3.area()
    .x(d => x(d.date))
    .y0(y(0))
    .y1(d => y(d.close));

  // SVG
  svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

    drawChart();
    drawAxes(); 
    setupInteractions();
}


function drawAxes() {
  xAxis = svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select(".domain").remove())
    .call(g =>
      g.selectAll(".tick line")
        .clone()
        .attr("x2", width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1)
    )
    .call(g =>
      g.append("text")
        .attr("x", -marginLeft)
        .attr("y", 8)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text("Daily close ($)")
    );
}

function drawChart() {
  svg.append("defs")
  .append("clipPath")
  .attr("id", "clip")
  .append("rect")
  .attr("x", marginLeft)
  .attr("y", marginTop)
  .attr("width", width - marginLeft - marginRight)
  .attr("height", height - marginTop - marginBottom);


  const chart = svg.append("g")
    .attr("clip-path", "url(#clip)");

  path = chart.append("path")
    .datum(data)
    .attr("fill", "steelblue")
    .attr("d", area);
}

function setupInteractions() {
    zoom = d3.zoom()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [width, height]])
      .filter(event => {
        if (event.type === "wheel") return true;
        if (event.type === "mousedown" && event.button === 1) return true;
        if (event.type === "touchstart") return true;
        return false; 
      })
      .on("zoom", zoomed);

      svg.call(zoom);

    brush = d3.brushX()
      .extent([[marginLeft, marginTop], [width - marginRight, height - marginBottom]])
    . on("end", brushed);

    svg.append("g")
      .attr("class", "brush")
      .call(brush);
}

function brushed(event) {
  if (!event.selection) return;

  const newDomain = event.selection.map(x.invert);

  if (newDomain[1] <= newDomain[0]) return;

  const span = newDomain[1] - newDomain[0];
  const scale = Math.min(
    10,
    (width - marginLeft - marginRight) /
              (event.selection[1] - event.selection[0])
  );

  svg.select(".brush").call(brush.move, null)
  svg.transition().call(
    zoom.transform,
    d3.zoomIdentity
      .scale(scale)     
      .translate(-x(newDomain[0]), 0)
  );
}

function zoomed(event) {
    const transform = event.transform;
    const newX = transform.rescaleX(x);
    
    console.log(
      data.slice(0, 5).map(d => newX(d.date))
    );
    console.log(x.domain());
    console.log(transform);
    console.log(newX.range());

    console.log(newX(new Date("2020-01-01")));
    console.log(x(new Date("2020-01-01"))); 
    path.attr("d", area.x(d => newX(d.date)));
    
    xAxis.call(
      d3.axisBottom(newX)
        .ticks(width / 80)
        .tickSizeOuter(0)
  );
}

    
function zoomTime(span) {
  const end = d3.max(data, d => d.date);
  let start;

  const DAY = 24 * 60 * 60 * 1000;

  switch(span) {

    case "5y":
      start = new Date(end.getTime() - 5 * 365 * DAY);
      break;

    case "1y":
      start = new Date(end.getTime() - 365 * DAY);
      break;

    case "1m":
      start = new Date(end.getTime() - 30 * DAY);
      break;

    case "1w":
      start = new Date(end.getTime() - 7 * DAY);
      break;
  }

  const dataMin = d3.min(data, d => d.date);
  const dataMax = d3.max(data, d => d.date);

  // Clamp range so we don't go outside dataset
  if (start < dataMin) start = dataMin;

  if (start > dataMax) return;

  const scale = width / (x(dataMax) - x(start));

  svg.call(
    zoom.transform,
    d3.zoomIdentity
      .scale(scale)
      .translate(-x(start), 0)
  );
}
  