$(function() {

  const tshirtCollectionId = '379094994';
  const accessToken        = '70713926e14ee6c0b19f901fe0e30efa';
  const domain             = 'noches-de-pitcheo.myshopify.com';
  const appId              = '6';

  // Build new ShopifyBuy client.
  const shopClient = ShopifyBuy.buildClient({ accessToken, domain, appId });

  // Fetch products based on t-shirt collection.
  shopClient.fetchQueryProducts({ collection_id: tshirtCollectionId }).then((products) => {
    return products.forEach((product) => {
      createDOMProductItems(product);
    });
  }).catch(() => {
    console.log('Request Failed');
  });

  // Create DOM Product List based on product Template.
  function createDOMProductItems(product) {
    let productDOMTemplate = `
      <div class="product" id="product-${product.id}">
        <figure class="product-image">
          <img src="${product.selectedVariantImage.src}" alt="${product.title}">
          <a href="${product.selectedVariant.checkoutUrl(1)}" class="btn btn--action">
            COMPRAR
          </a>
        </figure>
        <div class="product-info">
          <p class="product-name">${product.title}</p>
          <p class="product-price">${product.selectedVariant.formattedPrice} MXN</p>
        </div>
      </div>
    `;

    $('#product-list').append(productDOMTemplate);
  }
});
