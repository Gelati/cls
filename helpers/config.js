
module.exports = {
  baseurl: 'http://sfbay.craigslist.org/',
  query: 'search/apa/sfc?&maxAsk=3250&minAsk=2000&nh=10&nh=11&nh=12&nh=149&nh=18&nh=21&nh=4&srchType=T',

  // e.g., ['email@mail.com'] or for multiple ['email@mail.com', 'email2@mail.com']
  emails: [''],

  // for local use, either create an `.env` file with key=value on each line. e.g.,
  // SENDGRID_USERNAME=xxxxxxxxx
  // SENDGRID_PASSWORD=xxxxxxxxx
  //
  // Or edit these values `pass: 'xxxxxxx',`
  sendgrid: {
    pass: process.env.SENDGRID_PASSWORD,
    user: process.env.SENDGRID_USERNAME,
  },

  /**
   * To attempt to browse craigslist like a 'normal' user, only scrape a page
   * after `scrapeintervalsecs` of the last page and only attempt to scrape
   * `maxperscrape` pages.
   */
  cronintervalsecs: 900, // 15 minutes
  maxperscrape: 20,
  scrapeintervalsecs: 10,
};
