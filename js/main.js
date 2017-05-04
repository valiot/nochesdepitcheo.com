'use strict';

$(function () {
  var tshirtCollectionId = '379094994';
  var accessToken = '70713926e14ee6c0b19f901fe0e30efa';
  var domain = 'noches-de-pitcheo.myshopify.com';
  var appId = '6';

  var cart;
  var cartLineItemCount;
  var previousFocusItem;
  var collectionProductsHash;

  /* Build new ShopifyBuy client
  ============================================================ */
  var shopClient = ShopifyBuy.buildClient({ accessToken: accessToken, domain: domain, appId: appId });

  /* Fetch or create cart using Browsers LocalStorage
  ============================================================ */
  if (localStorage.getItem('lastCartId')) {
    shopClient.fetchCart(localStorage.getItem('lastCartId')).then(function (remoteCart) {
      cart = remoteCart;
      cartLineItemCount = cart.lineItems.length;
      renderCartItems();
    });
  } else {
    shopClient.createCart().then(function (newCart) {
      cart = newCart;
      localStorage.setItem('lastCartId', cart.id);
      cartLineItemCount = 0;
    });
  }

  /* Fetch products based on tshirt collection and init.
  ============================================================ */
  shopClient.fetchQueryProducts({ collection_id: tshirtCollectionId }).then(function (products) {

    // Form Hash with product.id as key for easier access.
    collectionProductsHash = products.reduce(function (map, obj) {
      map[obj.id] = obj;
      return map;
    }, {});

    return products.forEach(function (product, i) {
      createDOMProductItems(product, i);
      generateDOMProductSelector(product);
      attachOnVariantSelectListeners(product);
    });
  }).then(function () {
    updateCartTabButton();
    bindEventListeners();
  }).catch(function (errors) {
    console.log('failed request');
    console.error(errors);
  });

  /* Create DOM product list element based on product template.
  ============================================================ */
  function createDOMProductItems(product, i) {
    var productDOMTemplate = '\n      <div class="product" id="product-' + product.id + '">\n        <div class="product-title">' + product.title + '</div>\n\n        <figure class="product-image">\n          <img src="' + product.selectedVariantImage.src + '" alt="' + product.title + '">\n          <button data-product-id="' + product.id + '"\n            class="btn btn--buy js-prevent-cart-listener">\n            COMPRAR\n          </button>\n        </figure>\n\n        <div class="product-info">\n          <div class="product-variantSelector"></div>\n          <span class="product-price">' + product.selectedVariant.formattedPrice + '</span>\n        </div>\n      </div>\n    ';

    $('#product-list').append(productDOMTemplate);
  }

  /* Generate product variant element selectors.
  ============================================================ */
  function generateSelectors(product) {
    var elements = product.options.map(function (option) {
      var optionsHtml = option.values.map(function (value) {
        return '<option value="' + value + '">' + value + '</option>';
      });

      return '\n        <select class="select" name="' + option.name + '">' + optionsHtml + '</select>\n      ';
    });

    return elements;
  }

  /* Insert product variant selector into DOM.
  ============================================================ */
  function generateDOMProductSelector(product) {
    $('#product-' + product.id + ' .product-variantSelector').html(generateSelectors(product));
  }

  /* Bind Event Listeners
  ============================================================ */
  function bindEventListeners() {
    var _this = this;

    /* cart close button listener */
    $('.cart .btn--close').on('click', closeCart);

    /* click away listener to close cart */
    $(document).on('click', function (event) {
      if (!$(event.target).closest('.cart').length && !$(event.target).closest('.js-prevent-cart-listener').length) {
        closeCart();
      }
    });

    /* escape key handler */
    var ESCAPE_KEYCODE = 27;

    $(document).on('keydown', function (event) {
      if (event.which === ESCAPE_KEYCODE) {
        if (previousFocusItem) {
          $(previousFocusItem).focus();
          previousFocusItem = '';
        }

        closeCart();
      }
    });

    /* checkout button click listener */
    $('[data-js="btn-cart-checkout"]').on('click', function () {
      window.open(cart.checkoutUrl, '_self');
    });

    /* buy button click listener */
    $('.btn--buy').on('click', buyButtonClickHandler);

    /* increment quantity click listener */
    $('.cart').on('click', '.quantity-increment', function () {
      var productId = $(this).data('product-id');
      var variantId = $(this).data('variant-id');

      incrementQuantity(productId, variantId);
    });

    /* decrement quantity click listener */
    $('.cart').on('click', '.quantity-decrement', function () {
      var productId = $(this).data('product-id');
      var variantId = $(this).data('variant-id');

      decrementQuantity(productId, variantId);
    });

    /* update quantity field listener */
    $('.cart').on('keyup', '.cart-item__quantity', debounce(fieldQuantityHandler, 250));

    /* cart tab click listener */
    $('.btn--cart-tab').click(function () {
      setPreviousFocusItem(_this);
      openCart();
    });
  }

  /* Attach and control listeners onto buy button
  ============================================================ */
  function buyButtonClickHandler(event) {
    event.preventDefault();

    var attributeProductId = $(this).data('product-id');
    var product = collectionProductsHash[attributeProductId];
    var id = product.selectedVariant.id;
    var cartLineItem = findCartItemByVariantId(id);
    var quantity = cartLineItem ? cartLineItem.quantity + 1 : 1;

    addOrUpdateVariant(product.selectedVariant, quantity);
    setPreviousFocusItem(event.target);

    $('#checkout').focus();
  }

  /* Variant option change event handler.
  ============================================================ */
  function attachOnVariantSelectListeners(product) {
    var productElement = '#product-' + product.id;

    $(productElement + ' .product-variantSelector').on('change', 'select', function (event) {
      var $element = $(event.target);
      var name = $element.attr('name');
      var value = $element.val();

      product.options.filter(function (option) {
        return option.name === name;
      })[0].selected = value;

      updateVariantImage(product);
      updateVariantPrice(product);
    });
  }

  /* Update product image based on selected variant
  ============================================================ */
  function updateVariantImage(product) {
    var image = product.selectedVariantImage;
    var src = image ? image.src : ShopifyBuy.NO_IMAGE_URI;

    $('#product-' + product.id + ' .product-image').attr('src', src);
  }

  /* Update product variant price based on selected variant
  ============================================================ */
  function updateVariantPrice(product) {
    var variant = product.selectedVariant;

    $('#product-' + product.id + ' .product-price').text('$' + variant.price);
  }

  /* Update product variant quantity in cart
  ============================================================ */
  function updateQuantity(fn, productId, variantId) {
    var product = collectionProductsHash[productId];

    var variant = product.variants.filter(function (variant) {
      return variant.id === variantId;
    })[0];

    var cartLineItem = findCartItemByVariantId(variant.id);

    if (cartLineItem) {
      var quantity = fn(cartLineItem.quantity);
      updateVariantInCart(cartLineItem, quantity);
    }
  }

  /* Update product variant quantity in cart through input field
  ============================================================ */
  function fieldQuantityHandler(event) {
    var productId = parseInt($(this).closest('.cart-item').data('product-id'), 10);
    var variantId = parseInt($(this).closest('.cart-item').data('variant-id'), 10);
    var product = collectionProductsHash[productId];

    var variant = product.variants.filter(function (variant) {
      return variant.id === variantId;
    })[0];

    var cartLineItem = findCartItemByVariantId(variant.id);
    var quantity = event.target.value;

    if (cartLineItem) {
      updateVariantInCart(cartLineItem, quantity);
    }
  }

  /* Update details for item already in cart. Remove if necessary
  ============================================================ */
  function updateVariantInCart(cartLineItem, quantity) {
    var variantId = cartLineItem.variant_id;
    var cartLength = cart.lineItems.length;

    cart.updateLineItem(cartLineItem.id, quantity).then(function (updatedCart) {
      var $cartItem = $('.cart').find('.cart-item[data-variant-id="' + variantId + '"]');

      if (updatedCart.lineItems.length >= cartLength) {
        $cartItem.find('.cart-item__quantity').val(cartLineItem.quantity);
        $cartItem.find('.cart-item__price').text(formatAsMoney(cartLineItem.line_price));
      } else {
        $cartItem.addClass('js-hidden').bind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function () {
          $cartItem.remove();
        });
      }

      updateCartTabButton();
      updateTotalCartPricing();

      if (updatedCart.lineItems.length < 1) {
        closeCart();
      }
    }).catch(function (errors) {
      console.log('failed');
      console.error(errors);
    });
  }

  /* Update Total Cart Pricing
  ============================================================ */
  function updateTotalCartPricing() {
    $('.cart .pricing').text(formatAsMoney(cart.subtotal));
  }

  /* Open Cart
  ============================================================ */
  function openCart() {
    $('.cart').addClass('js-active');
  }

  /* Close Cart
  ============================================================ */
  function closeCart() {
    $('.cart').removeClass('js-active');
    $('.overlay').removeClass('js-active');
  }

  /* Decrease product cart quantity amount by 1
  ============================================================ */
  function decrementQuantity(productId, variantId) {
    updateQuantity(function (quantity) {
      return quantity - 1;
    }, productId, variantId);
  }

  /* Increase product cart quantity amount by 1
  ============================================================ */
  function incrementQuantity(productId, variantId) {
    updateQuantity(function (quantity) {
      return quantity + 1;
    }, productId, variantId);
  }

  /* Find Cart Line Item By Variant Id
  ============================================================ */
  function findCartItemByVariantId(variantId) {
    return cart.lineItems.filter(function (item) {
      return item.variant_id === variantId;
    })[0];
  }

  /* Determine action for variant adding/updating/removing
  ============================================================ */
  function addOrUpdateVariant(variant, quantity) {
    openCart();

    var cartLineItem = findCartItemByVariantId(variant.id);

    if (cartLineItem) {
      updateVariantInCart(cartLineItem, quantity);
    } else {
      addVariantToCart(variant, quantity);
    }

    updateCartTabButton();
  }

  /* Add 'quantity' amount of product 'variant' to cart
  ============================================================ */
  function addVariantToCart(variant, quantity) {
    openCart();

    cart.createLineItemsFromVariants({ variant: variant, quantity: quantity }).then(function () {
      var cartItem = cart.lineItems.filter(function (item) {
        return item.variant_id === variant.id;
      })[0];

      var $cartItem = renderCartItem(cartItem);
      var $cartItemContainer = $('.cart-item-container');

      $cartItemContainer.append($cartItem);

      setTimeout(function () {
        $cartItemContainer.find('.js-hidden').removeClass('js-hidden');
      }, 0);
    }).catch(function (errors) {
      console.log('failed');
      console.error(errors);
    });

    updateTotalCartPricing();
    updateCartTabButton();
  }

  /* Return required markup for single item rendering
  ============================================================ */
  function renderCartItem(lineItem) {
    var lineItemEmptyTemplate = $('#CartItemTemplate').html();
    var $lineItemTemplate = $(lineItemEmptyTemplate);
    var itemImage = lineItem.image.src;
    var variantId = lineItem.variant_id;
    var productId = lineItem.product_id;

    $lineItemTemplate.attr('data-product-id', productId);
    $lineItemTemplate.attr('data-variant-id', variantId);
    $lineItemTemplate.addClass('js-hidden');
    $lineItemTemplate.find('.cart-item__img').css('background-image', 'url(' + itemImage + ')');
    $lineItemTemplate.find('.cart-item__title').text(lineItem.title);
    $lineItemTemplate.find('.cart-item__variant-title').text(lineItem.variant_title);
    $lineItemTemplate.find('.cart-item__price').text(formatAsMoney(lineItem.line_price));
    $lineItemTemplate.find('.cart-item__quantity').attr('value', lineItem.quantity);

    $lineItemTemplate.find('.quantity-decrement').attr({
      'data-variant-id': variantId,
      'data-product-id': productId
    });

    $lineItemTemplate.find('.quantity-increment').attr({
      'data-variant-id': variantId,
      'data-product-id': productId
    });

    return $lineItemTemplate;
  }

  /* Render the line items currently in the cart
  ============================================================ */
  function renderCartItems() {
    var $cartItemContainer = $('.cart-item-container');

    $cartItemContainer.empty();

    //let lineItemEmptyTemplate = $('#CartItemTemplate').html();

    var $cartLineItems = cart.lineItems.map(function (lineItem, index) {
      return renderCartItem(lineItem);
    });

    $cartItemContainer.append($cartLineItems);

    setTimeout(function () {
      $cartItemContainer.find('.js-hidden').removeClass('js-hidden');
    }, 0);

    updateTotalCartPricing();
  }

  /* Format amount as currency
  ============================================================ */
  function formatAsMoney(amount, currency, thousandSeparator, decimalSeparator, localeDecimalSeparator) {
    currency = currency || '$';
    thousandSeparator = thousandSeparator || ',';
    decimalSeparator = decimalSeparator || '.';
    localeDecimalSeparator = localeDecimalSeparator || '.';

    var regex = new RegExp('(\\d)(?=(\\d{3})+\\.)', 'g');

    return currency + parseFloat(amount, 10).toFixed(2).replace(localeDecimalSeparator, decimalSeparator).replace(regex, '$1' + thousandSeparator).toString();
  }

  /* Update cart tab button
  ============================================================ */
  function updateCartTabButton() {
    if (cart.lineItems.length > 0) {
      $('.btn--cart-tab .btn__counter').html(cart.lineItemCount);
      $('.btn--cart-tab').addClass('js-active');
    } else {
      $('.btn--cart-tab').removeClass('js-active');
      $('.cart').removeClass('js-active');
    }
  }

  /* Set previously focused item for escape handler
  ============================================================ */
  function setPreviousFocusItem(item) {
    previousFocusItem = item;
  }

  /* Debounce taken from _.js (http://underscorejs.org/#debounce)
  ============================================================ */
  function debounce(func, wait, immediate) {
    var timeout = void 0;

    return function () {
      var context = this;
      var args = arguments;

      var later = function later() {
        timeout = null;

        if (!immediate) func.apply(context, args);
      };

      var callNow = immediate && !timeout;

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) func.apply(context, args);
    };
  }
});