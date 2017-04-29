$(function() {
  const tshirtCollectionId = '379094994';
  const accessToken        = '70713926e14ee6c0b19f901fe0e30efa';
  const domain             = 'noches-de-pitcheo.myshopify.com';
  const appId              = '6';

  // Build new ShopifyBuy client.
  const shopClient = ShopifyBuy.buildClient({ accessToken, domain, appId });

  // Fetch products based on tshirt collection and init.
  shopClient.fetchQueryProducts({ collection_id: tshirtCollectionId }).then((products) => {
    return products.forEach((product) => {
      createDOMProductItems(product);
      generateDOMProductSelector(product);
      attachOnVariantSelectListeners(product);
    });
  }).catch(() => {
    console.log('Request Failed');
  });

  // Create DOM product list based on product template.
  function createDOMProductItems(product) {
    let productDOMTemplate = `
      <div class="product" id="product-${product.id}">
        <figure class="variant-image">
          <img src="${product.selectedVariantImage.src}" alt="${product.title}">
          <a href="${product.selectedVariant.checkoutUrl(1)}" class="btn btn--action">
            COMPRAR
          </a>
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

  // Generate product variant element selectors.
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

  // Insert product variant selector into DOM.
  function generateDOMProductSelector(product) {
    $(`#product-${product.id} .variant-selector`).html(generateSelectors(product));
  }

  // Variant option change event handler.
  function attachOnVariantSelectListeners(product) {
    let productElement = `#product-${product.id}`;

    $(`${productElement} .variant-selector`).on('change', 'select', (event) => {
      let $element             = $(event.target);
      let name                 = $element.attr('name');
      let value                = $element.val();
      let selectedVariant      = product.selectedVariant;
      let selectedVariantImage = product.selectedVariantImage;
      let checkoutUrl          = selectedVariant.checkoutUrl(1);

      product.options.filter((option) => {
        return option.name === name;
      })[0].selected = value;

      // TODO: Update cart model.
    });
  }
});
