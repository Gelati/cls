var domino = require('domino');
var fs = require('fs');
var request = require('request');
var Handlebars = require('handlebars');
var Sendgrid = require('sendgrid').SendGrid;

if (process.env.REDISTOGO_URL) {
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  var redis = require('redis');
  var client = redis.createClient(rtg.port, rtg.hostname);

  client.auth(rtg.auth.split(":")[1]);
} else {
  var redis = require("redis"),
    client = redis.createClient();
}

var FORCE = process.env.FORCE || false;

var tpl = fs.readFileSync(__dirname + '/views/place.stache', 'utf8');
var lay = fs.readFileSync(__dirname + '/views/email_layout.stache', 'utf8');

var template = Handlebars.compile(tpl);
var layout = Handlebars.compile(lay);

var query = 'http://sfbay.craigslist.org/search/apa/sfc?&maxAsk=3250&minAsk=2000&nh=10&nh=11&nh=12&nh=149&nh=18&nh=21&nh=4&srchType=T';

var imagestoignore = 'facebook|twitter|tweet|linkedin|yelp|feed|rss|created_at|apply_now|header|top|contact_us|footer|logo|common|acctPhoto|space\.|jwavro|create_gif';

//email shiz
var sendgrid;
if (process.env.SENDEMAIL && process.env.SENDGRID_USERNAME) {
  sendgrid = new Sendgrid(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);
}

var places = {};
var msgs = [];


//DB
client.on("error", function (err) {
  console.log("Error " + err);
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

function getPlaces(cb) {
  var loaded = -1;
  var tot = 0;
  
  function addLoaded() {
    loaded += 1;
    if (loaded >= tot) {
      cb(places);
    }
  } 

  client.SMEMBERS('places', function (err, replies) {

    tot = replies.length;
    addLoaded();

    replies.forEach(function(uid) {
      if (places[uid]) addLoaded();
      client.hgetall(uid, function (err, obj) {
        places[uid] = obj;
        addLoaded();
      });
    });
  });
}


function scrape(index, cb) {
  request(index, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var win = domino.createWindow(body);
      var doc = win.document;

      cb(body, win, doc);
    } else {
      console.log(index, 'error');
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
    if (msgs.length) sendmail();
    client.end();
  }
}

function sws(txt) {
  return txt.replace(/\t/g, '').replace(/\n/g, '');
}

function sendmail() {
  var body = { body : msgs.join('').replace(/--+/g, ' ') };
  
  var message = {
    from:    "mattsain@gmail.com", 
    to:      ["sunita.bose@gmail.com", "mattsain@gmail.com"],
    subject: "Craigslist apartments for rent",
    html : sws(layout(body)),
    text : 'text'
  };

  console.log(message);

  if (sendgrid) {
    sendgrid.send(message, function(err, message) { 
      if (err) console.log(err);
      else console.log('Email sent');
    });
  }

}


function scrapePage(p) {

  scrape(p, function($, win, doc) {
    var title = doc.querySelector('h2').textContent;

    if (title !== 'This posting has been deleted by its author.') {
      var place = {
        title : title,
        href : p,
        added : Date.now(),
        photos : [],
        text: stripText(doc.getElementById('userbody').textContent),
      };

      place.summary = place.text.substring(0, 600);

      var imgset = doc.querySelectorAll('#iwt a');
      if (imgset.length) {
        imgset.forEach(function(item) {
          place.photos.push(item.href);
        });
      } else {
        doc.querySelectorAll('#userbody img').forEach(function(item) {
          if (item.src.search(imagestoignore) < 0) {
            place.photos.push(item.src);
          } else {
            console.log(item.src, 'rejected');
          }
        });
      }

      var maps = doc.querySelector('#leaflet');
      if (maps) {
        place.map = maps.getAttribute('data-latitude') + ',' + maps.getAttribute('data-longitude');
      }

      // add place to db
      addPlace(place);

      // add place to message
      msgs.push(template(place));
    }

    return placeLoaded();

  });

};


//initialisation
var loadedCount = -1;
var total = 0;

getPlaces(function () {
  scrape(query, function($, win, doc) {
    var rows = doc.querySelectorAll('p.row a');
    total = rows.length;
    placeLoaded();
    rows.forEach(function(item, i) {
      var href = item.href;
      if (isUnique(href)) {
        scrapePage(href);
      } else {
        placeLoaded();
      }
    });
  })
});

