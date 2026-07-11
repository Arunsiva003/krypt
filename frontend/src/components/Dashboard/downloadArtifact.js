export const imageArtifactDownload = (value, id, kind = 'image') => {
  const artifact = String(value || '').trim();
  if (!artifact) {
    return null;
  }

  if (artifact.startsWith('data:image/')) {
    return {
      href: artifact,
      fileName: `${kind === 'steganography' ? 'encoded_image' : 'image'}_${id}.png`,
      revoke: null,
    };
  }

  const isJsonPackage = artifact.startsWith('{') || artifact.startsWith('[');
  const blob = new Blob([artifact], {
    type: isJsonPackage ? 'application/json' : 'text/plain',
  });
  const href = URL.createObjectURL(blob);

  return {
    href,
    fileName: `${kind === 'steganography' ? 'encoded_image' : 'encrypted_image'}_${id}.krypt.json`,
    revoke: () => URL.revokeObjectURL(href),
  };
};

export const triggerArtifactDownload = (download) => {
  if (!download) return false;
  const link = document.createElement('a');
  link.href = download.href;
  link.download = download.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  download.revoke?.();
  return true;
};
