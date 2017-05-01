$(function() {
  const tshirtCollectionId = '379094994';
  const accessToken        = '70713926e14ee6c0b19f901fe0e30efa';
  const domain             = 'noches-de-pitcheo.myshopify.com';
  const appId              = '6';

  var cart;
  var cartLineItemCount;
  var previousFocusItem;
  var collectionProductsHash;

  /* Build new ShopifyBuy client
  ============================================================ */
  const shopClient = ShopifyBuy.buildClient({ accessToken, domain, appId });

  /* Fetch or create cart using Browsers LocalStorage
  ============================================================ */
  if (localStorage.getItem('lastCartId')) {
    shopClient.fetchCart(localStorage.getItem('lastCartId')).then((remoteCart) => {
      cart = remoteCart;
      cartLineItemCount = cart.lineItems.length;
      renderCartItems();
    });
  } else {
    shopClient.createCart().then((newCart) => {
      cart = newCart;
      localStorage.setItem('lastCartId', cart.id);
      cartLineItemCount = 0;
    });
  }

  /* Fetch products based on tshirt collection and init.
  ============================================================ */
  shopClient.fetchQueryProducts({ collection_id: tshirtCollectionId }).then((products) => {

    // Form Hash with product.id as key for easier access.
    collectionProductsHash = products.reduce(function(map, obj) {
      map[obj.id] = obj;
      return map;
    }, {});

    return products.forEach((product, i) => {
      createDOMProductItems(product, i);
      generateDOMProductSelector(product);
      attachOnVariantSelectListeners(product);
    });
  }).then(() => {
    updateCartTabButton();
    bindEventListeners();
  }).catch((errors) => {
    console.log('failed request');
    console.error(errors);
  });

  /* Create DOM product list element based on product template.
  ============================================================ */
  function createDOMProductItems(product, i) {
    let productDOMTemplate = `
      <div class="product" id="product-${product.id}">
        <figure class="variant-image">
          <img src="${product.selectedVariantImage.src}" alt="${product.title}">
          <button data-product-id="${product.id}"
            class="btn btn--action btn--add-to-cart js-prevent-cart-listener">
            COMPRAR
          </button>
        </figure>

        <div class="product-info">
          <p class="product-title">${product.title}</p>
          <p class="variant-price">${product.selectedVariant.formattedPrice}</p>
          <div class="variant-selector"></div>
        </div>
      </div>
    `;

    $('#product-list').append(productDOMTemplate);
  }

  /* Generate product variant element selectors.
  ============================================================ */
  function generateSelectors(product) {
    let elements = product.options.map((option) => {
      let optionsHtml = option.values.map((value) => {
        return `<option value="${value}">${value}</option>`;
      });

      return `
        <select class="select" name="${option.name}">${optionsHtml}</select>
      `;
    });

    return elements;
  }

  /* Insert product variant selector into DOM.
  ============================================================ */
  function generateDOMProductSelector(product) {
    $(`#product-${product.id} .variant-selector`).html(generateSelectors(product));
  }

  /* Bind Event Listeners
  ============================================================ */
  function bindEventListeners() {
    /* cart close button listener */
    $('.cart .btn--close').on('click', closeCart);

    /* click away listener to close cart */
    $(document).on('click', function(event) {
      if ((!$(event.target).closest('.cart').length) &&
          (!$(event.target).closest('.js-prevent-cart-listener').length)) {
            closeCart();
          }
    });

    /* escape key handler */
    let ESCAPE_KEYCODE = 27;

    $(document).on('keydown', (event) => {
      if (event.which === ESCAPE_KEYCODE) {
        if (previousFocusItem) {
          $(previousFocusItem).focus();
          previousFocusItem = ''
        }

        closeCart();
      }
    });

    /* checkout button click listener */
    $('[data-js="btn-cart-checkout"]').on('click', function() {
      window.open(cart.checkoutUrl, '_self');
    });

    /* buy button click listener */
    $('.btn--add-to-cart').on('click', buyButtonClickHandler);

    /* increment quantity click listener */
    $('.cart').on('click', '.quantity-increment', function() {
      let productId = $(this).data('product-id');
      let variantId = $(this).data('variant-id');

      incrementQuantity(productId, variantId);
    });

    /* decrement quantity click listener */
    $('.cart').on('click', '.quantity-decrement', function() {
      let productId = $(this).data('product-id');
      let variantId = $(this).data('variant-id');

      decrementQuantity(productId, variantId);
    });

    /* update quantity field listener */
    $('.cart').on('keyup', '.cart-item__quantity', debounce(fieldQuantityHandler, 250));

    /* cart tab click listener */
    $('.btn--cart-tab').click(() => {
      setPreviousFocusItem(this);
      openCart();
    });
  }

  /* Attach and control listeners onto buy button
  ============================================================ */
  function buyButtonClickHandler(event) {
    event.preventDefault();

    let attributeProductId = $(this).data('product-id');
    let product            = collectionProductsHash[attributeProductId];
    let id                 = product.selectedVariant.id;
    let cartLineItem       = findCartItemByVariantId(id);
    let quantity           = cartLineItem ? cartLineItem.quantity + 1 : 1;

    addOrUpdateVariant(product.selectedVariant, quantity);
    setPreviousFocusItem(event.target);

    $('#checkout').focus();
  }

  /* Variant option change event handler.
  ============================================================ */
  function attachOnVariantSelectListeners(product) {
    let productElement = `#product-${product.id}`;

    $(`${productElement} .variant-selector`).on('change', 'select', (event) => {
      let $element = $(event.target);
      let name     = $element.attr('name');
      let value    = $element.val();

      product.options.filter((option) => {
        return option.name === name;
      })[0].selected = value;

      updateVariantImage(product);
      updateVariantPrice(product);
    });
  }

  /* Update product image based on selected variant
  ============================================================ */
  function updateVariantImage(product) {
    let image = product.selectedVariantImage;
    let src = (image) ? image.src : ShopifyBuy.NO_IMAGE_URI;

    $(`#product-${product.id} .variant-image`).attr('src', src);
  }

  /* Update product variant price based on selected variant
  ============================================================ */
  function updateVariantPrice(product) {
    let variant = product.selectedVariant;

    $(`#product-${product.id} .variant-price`).text('$' + variant.price);
  }

  /* Update product variant quantity in cart
  ============================================================ */
  function updateQuantity(fn, productId, variantId) {
    let product = collectionProductsHash[productId];

    let variant = product.variants.filter((variant) => {
      return (variant.id === variantId);
    })[0];

    let cartLineItem = findCartItemByVariantId(variant.id);

    if (cartLineItem) {
      let quantity = fn(cartLineItem.quantity);
      updateVariantInCart(cartLineItem, quantity);
    }
  }

  /* Update product variant quantity in cart through input field
  ============================================================ */
  function fieldQuantityHandler(event) {
    let productId = parseInt($(this).closest('.cart-item').data('product-id'), 10);
    let variantId = parseInt($(this).closest('.cart-item').data('variant-id'), 10);
    let product   = collectionProductsHash[productId];

    let variant = product.variants.filter((variant) => {
      return (variant.id === variantId);
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
    let variantId  = cartLineItem.variant_id;
    let cartLength = cart.lineItems.length;

    cart.updateLineItem(cartLineItem.id, quantity).then((updatedCart) => {
      let $cartItem = $('.cart').find('.cart-item[data-variant-id="' + variantId + '"]');

      if (updatedCart.lineItems.length >= cartLength) {
        $cartItem.find('.cart-item__quantity').val(cartLineItem.quantity);
        $cartItem.find('.cart-item__price').text(formatAsMoney(cartLineItem.line_price));
      } else {
        $cartItem
          .addClass('js-hidden')
          .bind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', () => {
            $cartItem.remove();
          });
      }

      updateCartTabButton();
      updateTotalCartPricing();

      if (updatedCart.lineItems.length < 1) {
        closeCart();
      }
    }).catch((errors) => {
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
    updateQuantity((quantity) => {
      return quantity - 1;
    }, productId, variantId);
  }

  /* Increase product cart quantity amount by 1
  ============================================================ */
  function incrementQuantity(productId, variantId) {
    updateQuantity((quantity) => {
      return quantity + 1;
    }, productId, variantId);
  }

  /* Find Cart Line Item By Variant Id
  ============================================================ */
  function findCartItemByVariantId(variantId) {
    return cart.lineItems.filter((item) => {
      return (item.variant_id === variantId);
    })[0];
  }

  /* Determine action for variant adding/updating/removing
  ============================================================ */
  function addOrUpdateVariant(variant, quantity) {
    openCart();

    let cartLineItem = findCartItemByVariantId(variant.id);

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

    cart.createLineItemsFromVariants({ variant: variant, quantity: quantity }).then(() => {
      let cartItem = cart.lineItems.filter((item) => {
        return (item.variant_id === variant.id);
      })[0];

      let $cartItem          = renderCartItem(cartItem);
      let $cartItemContainer = $('.cart-item-container');

      $cartItemContainer.append($cartItem);

      setTimeout(() => {
        $cartItemContainer.find('.js-hidden').removeClass('js-hidden');
      }, 0)

    }).catch((errors) => {
      console.log('failed');
      console.error(errors);
    });

    updateTotalCartPricing();
    updateCartTabButton();
  }

  /* Return required markup for single item rendering
  ============================================================ */
  function renderCartItem(lineItem) {
    let lineItemEmptyTemplate = $('#CartItemTemplate').html();
    let $lineItemTemplate = $(lineItemEmptyTemplate);
    let itemImage = lineItem.image.src;
    let variantId = lineItem.variant_id;
    let productId = lineItem.product_id;

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
    let $cartItemContainer = $('.cart-item-container');

    $cartItemContainer.empty();

    //let lineItemEmptyTemplate = $('#CartItemTemplate').html();

    let $cartLineItems = cart.lineItems.map((lineItem, index) => {
      return renderCartItem(lineItem);
    });

    $cartItemContainer.append($cartLineItems);

    setTimeout(() => {
      $cartItemContainer.find('.js-hidden').removeClass('js-hidden');
    }, 0);

    updateTotalCartPricing();
  }

  /* Format amount as currency
  ============================================================ */
  function formatAsMoney(
    amount,
    currency,
    thousandSeparator,
    decimalSeparator,
    localeDecimalSeparator) {
      currency = currency || '$';
      thousandSeparator = thousandSeparator || ',';
      decimalSeparator = decimalSeparator || '.';
      localeDecimalSeparator = localeDecimalSeparator || '.';

      let regex = new RegExp('(\\d)(?=(\\d{3})+\\.)', 'g');

      return currency + parseFloat(amount, 10)
        .toFixed(2)
        .replace(localeDecimalSeparator, decimalSeparator)
        .replace(regex, '$1' + thousandSeparator)
        .toString();
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
    let timeout;

    return function() {
      let context = this;
      let args = arguments;

      let later = function() {
        timeout = null;

        if (!immediate) func.apply(context, args);
      };

      let callNow = immediate && !timeout;

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) func.apply(context, args);
    }
  }
});
