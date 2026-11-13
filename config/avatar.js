// Profile photos. Stored on Cloudinary, sent from the browser as base64.
module.exports = {
  MAX_BYTES: 5 * 1024 * 1024, // largest photo accepted (5 MB). Change this number to allow more or less.
  TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  SIZE_PX: 512, // Cloudinary crops it to a square this big, centred on the face
};
