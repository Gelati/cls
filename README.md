Setup
=====

 - Install node
 - Install redis
 - Install foreman (see heroku setup)
 - Edit `helpers/config.js`
   - Add your email address
   - Go to craigslist, make a search and copy the url query string into the `query` config.


Run
===

`foreman start`


Known issues
------------
I broke the sending email part of this... so that sucks, but i'm sure it's not hard to get it working again,
you'll need to create an account on 'SendMail' (should be free for 200 emails a day) or you can install some
package that sends email via gmail or some such.

