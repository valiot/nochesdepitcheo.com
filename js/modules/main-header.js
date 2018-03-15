$(document).ready(function () {
  $(window).scroll(function () {
    var $header = $('.mainHeader')
    var $headerTop = $(window).scrollTop()

    if ($headerTop > 1) {
      $header.addClass('is-scrolled')
    } else {
      $header.removeClass('is-scrolled')
    }
  });
});
