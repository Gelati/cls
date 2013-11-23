var config = require('./helpers/config');
var fetch = require('./fetch');

function runFetch() {
  fetch(function() {
    console.log('Next fetch in '+ config.cronintervalsecs + ' seconds.');
    setTimeout(runFetch, config.cronintervalsecs * 1000);
  });
}

runFetch();
