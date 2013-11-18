var client = require('./redis_client');

// returns an array
function sortit(data) {
  var out = [];
  for(var i in data) {
    data.hasOwnProperty(i) && out.push(data[i]);
  }
  return out.sort(function(a, b) {
    if (!a.rawDate && !b.rawDate) { return 0; }
    if (!b.rawDate) { return -1; }
    if (!a.rawDate) { return 1; }
    return b.rawDate.getTime() - a.rawDate.getTime();
  });
}

module.exports = function (type, cb) {
  var loaded = -1;
  var tot = 0;
  var places = {};

  function addLoaded() {
    loaded += 1;
    if (loaded >= tot) {
      cb(sortit(places));
    }
  }

  client.SMEMBERS(type, function (err, replies) {

    tot = replies.length;
    addLoaded();

    replies.forEach(function(uid) {
      places[uid] && addLoaded();
      client.hgetall(uid, function (err, obj) {
        obj.rawDate = obj.added ? new Date(obj.added * 1) : null;
        obj.rawDate && (obj.added = obj.rawDate.toLocaleString());
        obj.photos = (obj.photos) ? obj.photos.split(',') : [];
        obj.id = uid;
        places[uid] = obj;
        addLoaded();
      });
    });
  });
};
