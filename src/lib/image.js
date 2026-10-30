const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_DIMENSION = 1280;
const MAX_DATA_URL_LENGTH = 700000;

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
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function compressVehiclePhoto(file) {
  if (!file) throw new Error('Choose a photo first.');
  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('Choose a JPG, PNG or WebP image.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Choose an image smaller than 15 MB.');
  }

  const image = await loadImage(file);
  let scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
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
