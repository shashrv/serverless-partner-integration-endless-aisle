// Resolves product and partner images at build time. Unknown ids return undefined
// instead of building a path from untrusted input (for example an itemId from the API).
const productImages = import.meta.glob('../images/products/*.jpg', { eager: true, import: 'default' });
const partnerImages = import.meta.glob('../images/partners/*.jpg', { eager: true, import: 'default' });

export const productImage = (itemId) => productImages[`../images/products/${itemId}.jpg`];
export const partnerImage = (partnerId) => partnerImages[`../images/partners/${partnerId}.jpg`];
