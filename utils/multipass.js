const Multipassify = require('multipassify');

function generateUrl(customerData) {
  // init multipassify
  const multipassify = new Multipassify(process.env.SHOPIFY_MULTIPASS_SECRET);

  // Generate a Shopify multipass URL to your shop
  const url = multipassify.generateUrl(customerData, process.env.SHOPIFY_STORE_DOMAIN);

  // Generates a URL like:  https://yourstorename.myshopify.com/account/login/multipass/<MULTIPASS-TOKEN>
  return url;
}

module.exports = {
  generateUrl,
};
