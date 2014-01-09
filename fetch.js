var client = require('./helpers/redis_client');
var config = require('./helpers/config');
var getPlaces = require('./helpers/get_places');

var domino = require('domino');
var fs = require('fs');
var Handlebars = require('handlebars');
var request = require('request');
var sendgrid = require('sendgrid')(config.sendgrid.user, config.sendgrid.pass);

var style = fs.readFileSync(__dirname + '/public/style.css', 'utf8');
var tpl = fs.readFileSync(__dirname + '/views/place.stache', 'utf8');
var lay = fs.readFileSync(__dirname + '/views/email_layout.stache', 'utf8');

var template = Handlebars.compile(tpl);
var layout = Handlebars.compile(lay);

var query = config.baseurl + config.query;

var imagestoignore = '\.git|\.ga\.php|facebook|twitter|tweet|linkedin|yelp|feed|rss|created_at|apply_now|header|top|contact_us|footer|logo|common|acctPhoto|space\.|jwavro|create_gif';

var places = {};

//DB
client.on('error', console.log);

function getPlaceId(href) {
  return href.substring(href.lastIndexOf('/') + 1, href.indexOf('.html'));
}

function addPlace(obj) {
  var uid = getPlaceId(obj.href);
  client.HMSET(uid, obj);
  client.SADD('places', uid);
  client.SADD('new', uid);
  places[uid] = obj;
}


function scrape(index, cb) {
  request(index, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var win = domino.createWindow(body);
      var doc = win.document;

      cb(body, win, doc);
    } else {
      placeLoaded();
      console.log('scrape error', index, error, response.statusCode);
    }
  });
}

function isUnique(href) {
  var uid = getPlaceId(href);
  return !places[uid];
}

function stripText(txt) {
  var hasImgs = txt.indexOf('<!--\nimgList');
  return (hasImgs < 0) ? txt : txt.substring(0, hasImgs);
}

function placeLoaded() {
  loadedCount += 1;
  if (loadedCount >= total) {
    console.log('finished scraping. found ' + msgs.length + ' new places');
    msgs.length && sendmail();
  }
}

function sws(txt) {
  return txt.replace(/\t/g, '').replace(/\n/g, '');
}

function sendmail() {
  var sendTo = config.emails;

  if (!sendTo[0]) {
    return console.log('emails required, edit config.js');
  }

  var body = { body : msgs.join('').replace(/--+/g, ' '), style: style };

  var message = {
    from:    sendTo[0],
    to:      sendTo,
    subject: 'Craigslist apartments for rent',
    html :    sws(layout(body)),
  };

  sendgrid.send(message, console.log);
}


function scrapePlacePage(p) {
  scrape(p, function($, win, doc) {
    var title = doc.querySelector('h2').textContent;
    var postbody = doc.getElementById('postingbody');

    if (postbody) {
      var place = {
        title : title,
        href : p,
        added : Date.now(),
        photos : [],
        text: stripText(postbody.textContent)
      };

      place.summary = place.text.substring(0, 600);

      var imgset = doc.querySelectorAll('#thumbs a');
      if (imgset.length) {
        imgset.forEach(function(item) {
          place.photos.push(item.href);
        });
      } else {
        doc.querySelectorAll('.userbody img').forEach(function(item) {
          if (item.src.search(imagestoignore) < 0) {
            place.photos.push(item.src);
          } else {
            console.log('image rejected', item.src);
          }
        });
      }

      var maps = doc.getElementById('map');
      if (maps) {
        place.map = maps.getAttribute('data-latitude') + ',' + maps.getAttribute('data-longitude');
      }
      var address = doc.querySelector('.userbody .mapaddress');
      if (address) {
        place.address = address.textContent;
      }

      // add place to db
      addPlace(place);

      // add place to message
      msgs.push(template(place));
    } else {
      console.log('place skipped', title);
    }

    return placeLoaded();
  });
}


//init
var loadedCount;
var total;
var msgs;

module.exports = function(callback) {
  loadedCount = -1;
  msgs = [];

  console.log('Fetching...');
  getPlaces('new', function () {
    scrape(query, function($, win, doc) {
      var rows = doc.querySelectorAll('p.row .pl a');
      total = rows.length;
      placeLoaded();

      for (var ii = 0, uniqueItems = 0;
           ii < total && uniqueItems < config.maxperscrape;
           ii++) {
        var href = config.baseurl + rows[ii].href;
        if (isUnique(href)) {
          setTimeout(
            scrapePlacePage.bind(null, href),
            config.scrapeintervalsecs * uniqueItems * 1000
          );
          uniqueItems++;
        } else {
          placeLoaded();
        }
      }

      total = uniqueItems;
      var totalTime = (total - 1) * config.scrapeintervalsecs;

      console.log('Fetching '+total+' new listings in ~'+totalTime+' secconds');
      setTimeout(callback, totalTime * 1000);
    });
  });
};
