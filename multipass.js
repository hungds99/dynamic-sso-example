const Multipassify = require('multipassify');

const multipassify = new Multipassify(process.env.SHOPIFY_MULTIPASS_SECRET);

function generateUrl(customerData) {
  // Create your customer data hash
  // var customerData = { email: customerData.email, remote_ip: 'USERS IP ADDRESS', return_to: 'http://some.url' };
  console.log('customerData', customerData);

  // Encode a Multipass token
  var token = multipassify.encode(customerData);
  console.log('token', token);

  // Generate a Shopify multipass URL to your shop
  var url = multipassify.generateUrl(customerData, process.env.SHOPIFY_STORE_DOMAIN);
  console.log('url', url);

  // Generates a URL like:  https://yourstorename.myshopify.com/account/login/multipass/<MULTIPASS-TOKEN>
  return url;
}

module.exports = {
  generateUrl,
};
