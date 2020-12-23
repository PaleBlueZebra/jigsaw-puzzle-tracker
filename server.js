#!/usr/bin/env node

const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants");
var express = require("express"),
    fs = require('fs'),
    app = express(),
    GoogleChartsNode = require('google-charts-node');


var defaultConfig = {
// Chart Colors and size, see https://htmlcolorcodes.com/color-names/ 
  chartBackgroundColor: 'Black',    // Chart background color
  chartGridColor: 'DimGray',       // Chart grid color
  chartLineColor: 'PowderBlue',    // Chart line color
  chartTextColor: 'White',         // Chart axis text color
  chartHeight: 120,                // Chart height in pixels
  chartWidth: 320,                 // Chart width in pixels

// Other parameters
  chartUpdateFrequency: 30,        // seconds between updating the trend chart
  movingAverageMinutes: 15,        // timespan to use when calculating the piece placement rate 
  httpPort: 3333,                  // Listening Port
  displayTemplate: "Pieces placed: _COUNT_\r\n  Pieces/hour: _RATE_\r\n"
};

// Data file locations
const datadir = 'data';
const countFile = datadir + '/number.txt';       // Maintains current piece count
const historyFile = datadir + '/history.csv';    // Maintains placement history for all sessions
const chartDataFile = datadir + '/chart.csv';    // Maintains chart data (placement rate) for current session   
const displayFile = datadir + '/display.txt';    // Configure OBS Text Source to read this file
const chartImageFile = datadir + '/chart.png';   // Configure OBS Image Source to read this file
const configFile = 'config.json';

var cfg = defaultConfig;
var sessionStart = Date.now();


// Web API routes
app.use(express.static(__dirname + '/ui'))

app.get("/inc", (req, res, next) => {
  c = update(1);
  res.json(c);
 });

 app.get("/nop", (req, res, next) => {
  c = update(0);
  res.json(c);
 });
  
app.get("/dec", (req, res, next) => {
 c = update(-1);
 res.json(c);
});


// Utility functions

function getIPAddress() {
  var interfaces = require('os').networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];

    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
        return alias.address;
    }
  }

  return 'localhost';
}


// Main functions
function updateHistory(num) {
  let ts = Date.now();
  var rec = ts.toString() + "," + num + "\n";
  fs.appendFileSync(historyFile, rec, 'utf-8');
}

function updateCount(diff) {
  var data, num;
  try {
    data = fs.readFileSync(countFile, 'utf-8');
    num = parseInt(data);
  } catch (err) {
    num = 0;
  }
  if (diff != 0) {
    num = num + diff;
    fs.writeFileSync(countFile, num.toString(), 'utf-8');
  }
  return num;
}

function calcRate() {
  let now = Date.now();
  let ts = Date.now() - (cfg.movingAverageMinutes * 60000); 
  let tmt = 0;
  let firstC = 0;
  let lastC = 0;
  let firstT = 0;
  let lastT = 0;

  if (!fs.existsSync(historyFile)) {
    return 0;
  }
  
  fs.readFileSync(historyFile, 'utf-8').split(/\r?\n/).forEach(function(line) {
    if (line != "") {
    var row = line.split(",");
    lastT = parseInt(row[0]);
    if (lastT > ts) {
      lastC = parseInt(row[1]);
      if (firstC == 0) {
        firstC = lastC - 1;
        firstT = lastT;
      }
    }
  }
  });

  var duration = cfg.movingAverageMinutes * 60000;
  if ((now - sessionStart) < duration) {
    duration = now - sessionStart;
  } 
  if (duration < 60000) {
    duration = 60000;
  }

  var rate = (lastC - firstC) / duration * 3600000;
  return rate;
}

function updateDisplay(num, rate) {
  var display = cfg.displayTemplate.replace(/_COUNT_/g, num.toString()).replace(/_RATE_/g, rate.toFixed(1));
  fs.writeFileSync(displayFile, display, 'utf-8');
}

function clearChart() {
  fs.writeFileSync(chartDataFile, '', 'utf-8');
  updateChart(0);
}

async function updateChart(rate) {
  fs.appendFileSync(chartDataFile, rate.toString() + "\r\n", 'utf-8');

  var rateData = [];
  fs.readFileSync(chartDataFile, 'utf-8').split(/\r?\n/).forEach(function(line) {
    if (line != "") {
      rateData.push(['', parseFloat(line)]);
    }
  });

  if (rateData.length == 0) {
    rateData = [['',0]];
  }

  var dcStr = `
  var data = new google.visualization.DataTable();
  data.addColumn('string', 'X');
  data.addColumn('number', 'Rate');
  data.addRows(` + JSON.stringify(rateData) + `);
  var options = {
    curveType: 'function',
    legend: { position: 'none' },
    vAxis: {
      title: 'Pieces/hour'
    },
    backgroundColor: '` + cfg.chartBackgroundColor + `',
    chartArea:{left:23,top:6,width:'100%',height:'90%'},
    series: { 0: { color: '` + cfg.chartLineColor + `' }},
    hAxis: {
      gridlines: { color: '` + cfg.chartGridColor + `'},
      minorGridlines: { color: '` + cfg.chartGridColor + `'},
      baselineColor: '` + cfg.chartGridColor + `'      
    },
    vAxis: {
      gridlines: { color: '` + cfg.chartGridColor + `'},
      minorGridlines: { color: '` + cfg.chartGridColor + `'},
      baselineColor: '` + cfg.chartGridColor + `',
      textStyle: { color: '` + cfg.chartTextColor + `'}  
    }
  };
  var chart = new google.visualization.LineChart(document.getElementById('chart_div'));
  chart.draw(data, options);`;

  const image = await GoogleChartsNode.render(dcStr, {
    width: cfg.chartWidth,
    height: cfg.chartHeight,
  });

  fs.writeFileSync(chartImageFile, image);
}

function update(diff) {
  num = updateCount(diff);
 
  if (diff != 0) {
     updateHistory(num);
  }
  var rate = calcRate();
  updateDisplay(num, rate);

  if (diff == 0) {
      updateChart(rate);
  }

  return { 'count': num, 'rate': rate.toFixed(1) };
}

// STARTUP:

// Create data directory and config if they don't exist
if (!fs.existsSync(datadir)) {
  fs.mkdirSync(datadir, 0744);    
}
if (!fs.existsSync(configFile)) {
  fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2), 'utf-8');
} else {
  cfg = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
}

// Start with a clean chart
clearChart();
update(0);

// Start chart update timer
const updater = setInterval(() => {
  update(0);
}, cfg.chartUpdateFrequency * 1000);

// Start Web API
app.listen(cfg.httpPort, () => {
  console.log("Point your browser to http://" + getIPAddress() + ":" + cfg.httpPort + "/");
  console.log("When done, type Ctrl-C to exit");
});

// EOF