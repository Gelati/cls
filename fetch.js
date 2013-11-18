var domino = require('domino');
var fs = require('fs');
var Handlebars = require('handlebars');
var request = require('request');
var Sendgrid = require('sendgrid').SendGrid;

var client = require('./redis_client');
var config = require('./config');
var getPlaces = require('./get_places');

var FORCE = !!process.env.FORCE_SEND;
var PREVENT = !!process.env.PREVENT_SEND;

var style = fs.readFileSync(__dirname + '/public/style.css', 'utf8');
var tpl = fs.readFileSync(__dirname + '/views/place.stache', 'utf8');
var lay = fs.readFileSync(__dirname + '/views/email_layout.stache', 'utf8');

var template = Handlebars.compile(tpl);
var layout = Handlebars.compile(lay);

var sendTo = config.emails;
var query = config.baseurl + config.query;

var imagestoignore = '\.git|\.ga\.php|facebook|twitter|tweet|linkedin|yelp|feed|rss|created_at|apply_now|header|top|contact_us|footer|logo|common|acctPhoto|space\.|jwavro|create_gif';

//email shiz
var sendgrid;
if (!PREVENT && process.env.SENDEMAIL && process.env.SENDGRID_USERNAME) {
  sendgrid = new Sendgrid(
    process.env.SENDGRID_USERNAME,
    process.env.SENDGRID_PASSWORD
  );
}

var places = {};
var msgs = [];


//DB
client.on('error', function (err) {
  console.log('Error ' + err);
});

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
  return (FORCE) ? true : !places[uid];
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
    client.end();
  }
}

function sws(txt) {
  return txt.replace(/\t/g, '').replace(/\n/g, '');
}

function sendmail() {
  var body = { body : msgs.join('').replace(/--+/g, ' '), style: style };

  var message = {
    from:    sendTo[0],
    to:      sendTo,
    subject: 'Craigslist apartments for rent',
    html : sws(layout(body)),
    text : 'text'
  };

  sendgrid && sendgrid.send(message, function(err, message) {
    if (err) {
      console.log('sendgrid error', err);
    } else {
      console.log('Email sent');
    }
  });
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
var loadedCount = -1;
var total = 0;

getPlaces('new', function () {
  scrape(query, function($, win, doc) {
    var rows = doc.querySelectorAll('p.row .pl a');
    total = rows.length;
    placeLoaded();
    rows.forEach(function(item, i) {
      var href = config.baseurl + item.href;
      if (isUnique(href)) {
        scrapePlacePage(href);
      } else {
        placeLoaded();
      }
    });
  });
});

