'use strict';

$(function () {
  var tshirtCollectionId = '379094994';
  var accessToken = '70713926e14ee6c0b19f901fe0e30efa';
  var domain = 'noches-de-pitcheo.myshopify.com';
  var appId = '6';

  // Build new ShopifyBuy client.
  var shopClient = ShopifyBuy.buildClient({ accessToken: accessToken, domain: domain, appId: appId });

  // Fetch products based on tshirt collection and init.
  shopClient.fetchQueryProducts({ collection_id: tshirtCollectionId }).then(function (products) {
    return products.forEach(function (product) {
      createDOMProductItems(product);
      generateDOMProductSelector(product);
      attachOnVariantSelectListeners(product);
    });
  }).catch(function () {
    console.log('Request Failed');
  });

  // Create DOM product list based on product template.
  function createDOMProductItems(product) {
    var productDOMTemplate = '\n      <div class="product" id="product-' + product.id + '">\n        <figure class="variant-image">\n          <img src="' + product.selectedVariantImage.src + '" alt="' + product.title + '">\n          <a href="' + product.selectedVariant.checkoutUrl(1) + '" class="btn btn--action">\n            COMPRAR\n          </a>\n        </figure>\n\n        <div class="product-info">\n          <p class="product-title">' + product.title + '</p>\n          <p class="variant-price">' + product.selectedVariant.formattedPrice + '</p>\n          <div class="variant-selector"></div>\n        </div>\n      </div>\n    ';

    $('#product-list').append(productDOMTemplate);
  }

  // Generate product variant element selectors.
  function generateSelectors(product) {
    var elements = product.options.map(function (option) {
      var optionsHtml = option.values.map(function (value) {
        return '<option value="' + value + '">' + value + '</option>';
      });

      return '\n        <select class="select" name="' + option.name + '">' + optionsHtml + '</select>\n      ';
    });

    return elements;
  }

  // Insert product variant selector into DOM.
  function generateDOMProductSelector(product) {
    $('#product-' + product.id + ' .variant-selector').html(generateSelectors(product));
  }

  // Variant option change event handler.
  function attachOnVariantSelectListeners(product) {
    var productElement = '#product-' + product.id;

    $(productElement + ' .variant-selector').on('change', 'select', function (event) {
      var $element = $(event.target);
      var name = $element.attr('name');
      var value = $element.val();
      var selectedVariant = product.selectedVariant;
      var selectedVariantImage = product.selectedVariantImage;
      var checkoutUrl = selectedVariant.checkoutUrl(1);

      product.options.filter(function (option) {
        return option.name === name;
      })[0].selected = value;

      // TODO: Update cart model.
    });
  }
});