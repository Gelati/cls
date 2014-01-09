Setup
=====

Configure
---------

Edit `helpers/config.js`
 - Add your email address
 - Go to craigslist, make a search and copy the url query string into the `query` config.

You have two options, running this purely locally, or on heroku.

Local Setup
-----------

 - Install git
 - Install nodejs (and npm)
 - Install redis
 - Install foreman (see heroku setup)
 - npm install
 - sign up for a sendgrid account and add it to `helpers/config.js` in place of the current user and password.

To start it, just run:

 # `foreman start`


Heroku
------

Assuming you've setup your heroku by following https://devcenter.heroku.com/articles/quickstart and then
https://devcenter.heroku.com/articles/getting-started-with-nodejs.

Terminal:

 - heroku addons:add sendgrid
 - heroku addons:add redistogo

Then you should be able to go the heroku url, and see the results. Emails should come on a 10 minute schedule.


Known issues
------------

May not work on heroku because Craigslist highly police scraping and the IP may have been / get blocked.

