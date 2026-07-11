import { imageArtifactDownload } from './downloadArtifact';

describe('imageArtifactDownload', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => 'blob:artifact');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('downloads image encryption history as a krypt package', () => {
    const download = imageArtifactDownload('{"ciphertext":"abc"}', 42, 'image');

    expect(download.fileName).toBe('encrypted_image_42.krypt.json');
    expect(download.href).toBe('blob:artifact');
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('downloads steganography history as a png data url', () => {
    const download = imageArtifactDownload('data:image/png;base64,abc', 7, 'steganography');

    expect(download.fileName).toBe('encoded_image_7.png');
    expect(download.href).toBe('data:image/png;base64,abc');
    expect(download.revoke).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects empty saved artifacts', () => {
    expect(imageArtifactDownload('', 1, 'image')).toBeNull();
  });
});
