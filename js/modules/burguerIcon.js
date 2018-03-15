$(document).ready(function () {
  $('#burguerIcon').click(function() {
    $(this).toggleClass("is-active"),
    $('.mainHeader').toggleClass("is-active"),
    $('.mobileNav').toggleClass("is-active")
  });
});
