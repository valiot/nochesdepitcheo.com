$(function() {
  var shopClient = ShopifyBuy.buildClient({
    accessToken: '70713926e14ee6c0b19f901fe0e30efa',
    domain: 'noches-de-pitcheo.myshopify.com',
    appId: '6'
  });

  var comfyTshirt = "8600847954";
  var normalTshirt = "9012626642";
  var longTshirt = "9012631058";

  shopClient.fetchProduct(comfyTshirt).then(function(product) {
    var comfyTshirtContent =
    "<figure class='product-image'>" +
      "<img src='" + product.selectedVariantImage.src + "' >" +
      "<a class='btn btn--action' href='" + product.selectedVariant.checkoutUrl(1) +
      "'>COMPRAR</a>" +
    "</figure>" +
    "<div class='product-info'>" +
      "<p class='product-name'>" + product.title + "</p>" +
      "<p class='product-price'>$2OOmx</p>" +
    "</div>";

    $('#comfyTshirt').html(comfyTshirtContent); 
  });

  shopClient.fetchProduct(normalTshirt).then(function(product) {
    var normalTshirtContent =
    "<figure class='product-image'>" +
      "<img src='" + product.selectedVariantImage.src + "' >" +
      "<a class='btn btn--action' href='" + product.selectedVariant.checkoutUrl(1) +
      "'>COMPRAR</a>" +
    "</figure>" +
    "<div class='product-info'>" +
      "<p class='product-name'>" + product.title + "</p>" +
      "<p class='product-price'>$2OOmx</p>" +
    "</div>";

    $('#normalTshirt').html(normalTshirtContent); 
  });

  shopClient.fetchProduct(longTshirt).then(function(product) {
    var longTshirtContent =
    "<figure class='product-image'>" +
      "<img src='" + product.selectedVariantImage.src + "' >" +
      "<a class='btn btn--action' href='" + product.selectedVariant.checkoutUrl(1) +
      "'>COMPRAR</a>" +
    "</figure>" +
    "<div class='product-info'>" +
      "<p class='product-name'>" + product.title + "</p>" +
      "<p class='product-price'>$2OOmx</p>" +
    "</div>";

    $('#longTshirt').html(longTshirtContent); 
  });
});
