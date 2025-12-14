// Polyfill for crypto.randomUUID() for environments that don't support it
// This is needed for react-text-to-speech library compatibility

(function () {
  // Polyfill implementation for crypto.randomUUID()
  const generateUUID = function () {
    // Generate a UUID v4 compliant string
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  // Get the crypto object (works in both browser and Node.js environments)
  let cryptoObj = null;
  if (typeof window !== 'undefined' && window.crypto) {
    cryptoObj = window.crypto;
  } else if (typeof crypto !== 'undefined') {
    cryptoObj = crypto;
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    cryptoObj = globalThis.crypto;
  }

  // Add polyfill if crypto.randomUUID doesn't exist
  if (cryptoObj && !cryptoObj.randomUUID) {
    cryptoObj.randomUUID = generateUUID;
  }
})();
