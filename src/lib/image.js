const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_DIMENSION = 1280;
const MAX_PIXELS = 40 * 1000000;
const MAX_DATA_URL_LENGTH = 700000;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateImageSignature(bytes, declaredType) {
  const signature = Array.from(bytes).slice(0, 16);
  const jpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const png = signature.slice(0, 8).every((byte, index) =>
    byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]
  );
  const webp = String.fromCharCode(...signature.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...signature.slice(8, 12)) === 'WEBP';

  return ALLOWED_MIME_TYPES.has(declaredType) && (jpeg || png || webp);
}

async function readImageSignature(file) {
  const buffer = await file.slice(0, 16).arrayBuffer();
  return validateImageSignature(new Uint8Array(buffer), file.type);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be read. Try another photo.'));
    };
    image.src = url;
  });
}

function render(image, scale, quality) {
  const canvas = document.createElement('canvas');
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the photo.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function compressVehiclePhoto(file) {
  if (!file) throw new Error('Choose a photo first.');
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('Choose a JPG, PNG or WebP image.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Choose an image smaller than 15 MB.');
  }
  if (!(await readImageSignature(file))) {
    throw new Error('That file is not a valid JPG, PNG or WebP image.');
  }

  const image = await loadImage(file);
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('That image has invalid dimensions.');
  }
  if (image.naturalWidth * image.naturalHeight > MAX_PIXELS) {
    throw new Error('That image resolution is too large.');
  }
  let scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  let quality = 0.82;
  let dataUrl = render(image, scale, quality);

  for (let attempt = 0; attempt < 8 && dataUrl.length > MAX_DATA_URL_LENGTH; attempt += 1) {
    quality = Math.max(0.4, quality - 0.08);
    dataUrl = render(image, scale, quality);
  }

  while (dataUrl.length > MAX_DATA_URL_LENGTH && scale > 0.3) {
    scale *= 0.85;
    dataUrl = render(image, scale, quality);
  }

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('That photo is still too large. Try a smaller or simpler image.');
  }

  return dataUrl;
}
