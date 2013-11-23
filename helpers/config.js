/**
 * To attempt to browse craigslist like a 'normal' user, only scrape a page
 * after `scrapeintervalsecs` of the last page and only attempt to scrape
 * `maxperscrape` pages.
 */

module.exports = {
  baseurl: 'http://sfbay.craigslist.org/',
  cronintervalsecs: 30,
  emails: [''],
  maxperscrape: 20,
  query: 'search/apa/sfc?&maxAsk=3250&minAsk=2000&nh=10&nh=11&nh=12&nh=149&nh=18&nh=21&nh=4&srchType=T',
  scrapeintervalsecs: 10
};
