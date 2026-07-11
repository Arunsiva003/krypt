import React, { useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Tab, Tabs, TextField, CircularProgress, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import api from '../../api/client';
import { trackToolAction } from '../../analytics';
import { decryptTextPackage, encryptTextPackage } from '../../cryptoUtils';
import { useFeedback } from '../Feedback/FeedbackProvider';
import useMobileResultReveal from '../../hooks/useMobileResultReveal';
import PageShell from '../Layout/PageShell';
import SectionHeader from '../Layout/SectionHeader';
import SurfacePanel from '../Layout/SurfacePanel';

const XOREncryption = () => {
  const [image, setImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [encryptedPackage, setEncryptedPackage] = useState('');
  const [key, setKey] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { notify } = useFeedback();
  const { resultRef, revealResult } = useMobileResultReveal();
  const canDownload = Boolean(processedImage || (isEncrypted && encryptedPackage));
  const resultReady = canDownload;
  const resultLabel = errorMessage ? 'Check file' : resultReady ? 'Ready' : 'Waiting';
  const resultColor = errorMessage ? 'warning' : resultReady ? 'success' : 'default';

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (upload) => {
      if (selectedTab === 0) {
        setImage(upload.target.result);
      } else {
        setEncryptedPackage(String(upload.target.result || ''));
        setImage(null);
      }
      setProcessedImage(null);
      setIsEncrypted(false);
      setErrorMessage('');
    };
    if (selectedTab === 0) reader.readAsDataURL(file);
    else reader.readAsText(file);
  };

  const processImage = async (encrypt) => {
    if ((!encrypt && !encryptedPackage.trim()) || (encrypt && !image) || !key.trim()) {
      notify(encrypt ? 'Choose an image and enter a key first.' : 'Choose an encrypted package and enter the key first.', 'warning');
      return;
    }

    setProcessing(true);
    setErrorMessage('');

    try {
      if (encrypt) {
        const pkg = await encryptTextPackage(image, key, { tool: 'image-encryption', payload: 'image-data-url' });
        setEncryptedPackage(JSON.stringify(pkg, null, 2));
        setProcessedImage(null);
        setIsEncrypted(true);
        trackToolAction('image-encryption', 'encrypt');
        notify('Image encrypted with AES-GCM.', 'success');
        revealResult();
      } else {
        const dataUrl = await decryptTextPackage(JSON.parse(encryptedPackage), key);
        if (!dataUrl.startsWith('data:image/')) throw new Error('Invalid image package');
        setProcessedImage(dataUrl);
        setIsEncrypted(false);
        trackToolAction('image-encryption', 'decrypt');
        notify('Image decrypted.', 'success');
        revealResult();
      }
    } catch {
      setErrorMessage(encrypt ? 'Unable to encrypt this image. Try a smaller PNG or JPG.' : 'Unable to decrypt this image package with the provided key.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!canDownload) return;
    const link = document.createElement('a');
    if (isEncrypted) {
      link.href = URL.createObjectURL(new Blob([encryptedPackage], { type: 'application/json' }));
      link.download = 'encrypted_image.krypt.json';
    } else {
      link.href = processedImage;
      link.download = 'decrypted_image.png';
    }
    link.click();
    if (isEncrypted) URL.revokeObjectURL(link.href);
    trackToolAction('image-encryption', 'download');
  };

  const handleTabChange = (event, newValue) => {
    setKey('');
    setImage(null);
    setProcessedImage(null);
    setEncryptedPackage('');
    setIsEncrypted(false);
    setErrorMessage('');
    setSelectedTab(newValue);
  };

  const handleCloudSave = async () => {
    if (!encryptedPackage || !isEncrypted) {
      notify('Encrypt an image before saving it.', 'warning');
      return;
    }
    try {
      setSaving(true);
      await api.post('/api/rust/image', { encrypted_image_link: encryptedPackage });
      trackToolAction('image-encryption', 'save');
      notify('Encrypted image saved. The key was not stored.', 'success');
    } catch (err) {
      notify(err.response?.data?.error || 'Unable to save encrypted image.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <Stack spacing={3}>
        <SectionHeader
          eyebrow="File workflow"
          title="Image Encryption"
          description="Encrypt image files locally into AES-GCM packages, or decrypt packages back into image previews."
        />
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Krypt stores only encrypted image packages. Your key never leaves the browser.
        </Alert>
        <SurfacePanel>
          <Stack spacing={3}>
            <Tabs value={selectedTab} onChange={handleTabChange}>
              <Tab label="Encrypt" />
              <Tab label="Decrypt" />
            </Tabs>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: { xs: 2, md: 3 },
              }}
            >
              <Box>
                <Stack spacing={2}>
                  <Button variant="outlined" component="label">
                    {selectedTab === 0 ? 'Choose image' : 'Choose .krypt package'}
                    <input type="file" accept={selectedTab === 0 ? 'image/*' : 'application/json,.json,.krypt'} hidden onChange={handleImageChange} />
                  </Button>
                  <TextField
                    label={selectedTab === 0 ? 'Encryption key' : 'Decryption key'}
                    fullWidth
                    value={key}
                    onChange={(event) => setKey(event.target.value)}
                  />
                  <Button variant="contained" onClick={() => processImage(selectedTab === 0)} disabled={processing}>
                    {processing ? <CircularProgress size={22} /> : selectedTab === 0 ? 'Encrypt Image' : 'Decrypt Image'}
                  </Button>
                </Stack>
              </Box>
              <Box ref={resultRef} sx={{ scrollMarginTop: { xs: 2, md: 0 } }} role="region" aria-label="Image encryption result">
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">Result</Typography>
                    <Chip size="small" label={resultLabel} color={resultColor} />
                  </Stack>
                  {image || processedImage ? (
                    <Box component="img" src={processedImage || image} alt="Selected result preview" sx={{ width: '100%', maxHeight: 340, objectFit: 'contain', bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
                  ) : (
                    <Box sx={{ minHeight: 300, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'text.secondary', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                      Select an image to preview it here.
                    </Box>
                  )}
                  {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
                  {encryptedPackage ? (
                    <TextField
                      label="Encrypted package"
                      multiline
                      minRows={5}
                      fullWidth
                      value={encryptedPackage}
                      InputProps={{ readOnly: true }}
                    />
                  ) : null}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button startIcon={<DownloadIcon />} onClick={downloadImage} disabled={!canDownload}>
                      Download
                    </Button>
                    <Button startIcon={<SaveIcon />} onClick={handleCloudSave} disabled={saving || !encryptedPackage || !isEncrypted}>
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Stack>
        </SurfacePanel>
      </Stack>
    </PageShell>
  );
};

export default XOREncryption;
