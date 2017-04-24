'use strict';

$(function () {

  var tshirtCollectionId = '379094994';
  var accessToken = '70713926e14ee6c0b19f901fe0e30efa';
  var domain = 'noches-de-pitcheo.myshopify.com';
  var appId = '6';

  // Build new ShopifyBuy client.
  var shopClient = ShopifyBuy.buildClient({ accessToken: accessToken, domain: domain, appId: appId });

  // Fetch products based on t-shirt collection.
  shopClient.fetchQueryProducts({ collection_id: tshirtCollectionId }).then(function (products) {
    return products.forEach(function (product) {
      createDOMProductItems(product);
    });
  }).catch(function () {
    console.log('Request Failed');
  });

  // Create DOM Product List based on product Template.
  function createDOMProductItems(product) {
    var productDOMTemplate = '\n      <div class="product" id="product-' + product.id + '">\n        <figure class="product-image">\n          <img src="' + product.selectedVariantImage.src + '" alt="' + product.title + '">\n          <a href="' + product.selectedVariant.checkoutUrl(1) + '" class="btn btn--action">\n            COMPRAR\n          </a>\n        </figure>\n        <div class="product-info">\n          <p class="product-name">' + product.title + '</p>\n          <p class="product-price">' + product.selectedVariant.formattedPrice + ' MXN</p>\n        </div>\n      </div>\n    ';

    $('#product-list').append(productDOMTemplate);
  }
});