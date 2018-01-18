var paths = {};

//Site directory
paths.siteDir           = './';

// HTML assets
paths.htmlFiles         = './**/*.html';

// Images assets
paths.imgFolder         = './img/';
paths.imgFiles         = './img/**/*.{JPG,jpg,png,gif}';

// CSS asstes
paths.cssFolder         = './css/';
paths.cssMain           = './css/main.css';
paths.cssMainMin        = './css/main.min.css';

// Stylus assets
paths.stylusFolder      = './css/stylus/';
paths.stylusFiles       = './css/stylus/**/*.styl';
paths.stylusMain        = './css/stylus/main.styl';

// Javascript assets
paths.jsFolder          = './js/';
paths.jsFiles           = './js/**/*.js';
paths.jsModules         = './js/modules/*.js';
paths.jsVendor          = './js/vendor/*.js';
paths.jsMain            = './js/main.js';
paths.jsMainMin         = './js/main.min.js';

module.exports = paths;