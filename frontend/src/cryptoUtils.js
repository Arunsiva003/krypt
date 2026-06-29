const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const bytesToBase64 = (bytes) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < view.length; i += chunkSize) {
    binary += String.fromCharCode(...view.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

export const base64ToBytes = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const randomBytes = (length) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

export const randomBase64 = (length) => bytesToBase64(randomBytes(length));

export const deriveAesKey = async (passphrase, salt, iterations = 150000) => {
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey', 'deriveBits']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
};

export const deriveBitsHex = async (passphrase, saltText, iterations = 150000) => {
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(saltText), iterations, hash: 'SHA-256' },
    baseKey,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
};

export const encryptTextPackage = async (plainText, passphrase, metadata = {}) => {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const iterations = metadata.iterations || 150000;
  const key = await deriveAesKey(passphrase, salt, iterations);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plainText));
  return {
    version: 1,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
    ...metadata,
  };
};

export const decryptTextPackage = async (pkg, passphrase) => {
  const key = await deriveAesKey(passphrase, base64ToBytes(pkg.salt), pkg.iterations || 150000);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(pkg.iv) }, key, base64ToBytes(pkg.ciphertext));
  return decoder.decode(plain);
};

export const encryptBytesPackage = async (bytes, passphrase, metadata = {}) => {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const iterations = metadata.iterations || 150000;
  const key = await deriveAesKey(passphrase, salt, iterations);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return {
    version: 1,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
    ...metadata,
  };
};

export const decryptBytesPackage = async (pkg, passphrase) => {
  const key = await deriveAesKey(passphrase, base64ToBytes(pkg.salt), pkg.iterations || 150000);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(pkg.iv) }, key, base64ToBytes(pkg.ciphertext));
  return new Uint8Array(plain);
};

export const hashBytes = async (bytes, algorithm = 'SHA-256') => {
  const digest = await crypto.subtle.digest(algorithm, bytes);
  return bytesToHex(new Uint8Array(digest));
};

export const hashText = (text, algorithm = 'SHA-256') => hashBytes(encoder.encode(text), algorithm);

export const bytesToHex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

export const downloadTextFile = (fileName, content, type = 'application/json') => {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const downloadBytes = (fileName, bytes, type = 'application/octet-stream') => {
  const blob = new Blob([bytes], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const readFileAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

export const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
