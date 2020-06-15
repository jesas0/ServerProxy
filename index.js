var rp = require('request-promise');
var cheerio = require('cheerio'); // Basically jQuery for node.js

var options = {
    uri: 'http://www.google.com',
    transform: function (body) {
        return cheerio.load(body);
    }
};

rp(options)
    .then(function ($) {
      console.log($)
    })
    .catch(function (err) {
        console.log(2)
    });


