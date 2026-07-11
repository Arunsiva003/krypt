import React, { useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Tab, Tabs, TextField, CircularProgress, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import api, { isMockerEnabled } from '../../api/client';
import { trackToolAction } from '../../analytics';
import { useFeedback } from '../Feedback/FeedbackProvider';
import useMobileResultReveal from '../../hooks/useMobileResultReveal';
import PageShell from '../Layout/PageShell';
import SectionHeader from '../Layout/SectionHeader';
import SurfacePanel from '../Layout/SurfacePanel';

const Steganography = () => {
  const [message, setMessage] = useState('');
  const [imageSrc, setImageSrc] = useState('');
  const [decodedMessage, setDecodedMessage] = useState('');
  const [encodedImageSrc, setEncodedImageSrc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [operation, setOperation] = useState('encrypt');
  const [passkey, setPasskey] = useState('');
  const [saving, setSaving] = useState(false);
  const { notify } = useFeedback();
  const { resultRef, revealResult } = useMobileResultReveal();
  const resultReady = Boolean(encodedImageSrc || decodedMessage);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageSrc(URL.createObjectURL(file));
    setEncodedImageSrc('');
    setDecodedMessage('');
  };

  const encodeMessage = async () => {
    if (!message.trim() || !imageSrc || !passkey.trim()) {
      notify('Enter a message, select an image, and provide a passkey.', 'warning');
      return;
    }

    setIsLoading(true);
    const image = new Image();
    image.src = imageSrc;

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const payload = `{${message.length}}${message}`;
      const binaryMessage = payload.split('').map((char) => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
      const passkeyBinary = passkey.split('').map((char) => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');

      if (binaryMessage.length * 4 > pixels.length) {
        setIsLoading(false);
        notify('Message is too large for the selected image.', 'error');
        return;
      }

      for (let i = 0; i < binaryMessage.length; i += 1) {
        pixels[i * 4] = (pixels[i * 4] & 0b11111110) | ((parseInt(binaryMessage[i], 2) + parseInt(passkeyBinary[i % passkeyBinary.length], 2)) % 2);
      }

      context.putImageData(imageData, 0, 0);
      setEncodedImageSrc(canvas.toDataURL('image/png'));
      setDecodedMessage('');
      setIsLoading(false);
      trackToolAction('steganography', 'encode');
      notify('Message hidden inside image.', 'success');
      revealResult();
    };

    image.onerror = () => {
      setIsLoading(false);
      notify('Unable to load this image.', 'error');
    };
  };

  const decodeMessage = async () => {
    if (!imageSrc || !passkey.trim()) {
      notify('Select an encoded image and provide the passkey.', 'warning');
      return;
    }

    setIsLoading(true);
    const image = new Image();
    image.src = imageSrc;

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);

      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let binaryMessage = '';
      for (let i = 0; i < pixels.length; i += 4) {
        binaryMessage += (pixels[i] & 1).toString();
      }

      const passkeyBinary = passkey.split('').map((char) => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
      let decryptedBinaryMessage = '';
      for (let i = 0; i < binaryMessage.length; i += 1) {
        decryptedBinaryMessage += ((parseInt(binaryMessage[i], 2) - parseInt(passkeyBinary[i % passkeyBinary.length], 2)) + 2) % 2;
      }

      let decoded = '';
      for (let i = 0; i < decryptedBinaryMessage.length; i += 8) {
        decoded += String.fromCharCode(parseInt(decryptedBinaryMessage.slice(i, i + 8), 2));
      }

      const match = decoded.match(/\{(\d+)\}/);
      const msgLen = match ? parseInt(match[1], 10) : 0;
      const cleanMessage = decoded.replace(/\{\d+\}/g, '').slice(0, msgLen);
      setDecodedMessage(cleanMessage);
      setEncodedImageSrc('');
      setIsLoading(false);
      trackToolAction('steganography', 'decode');
      notify(cleanMessage ? 'Message decoded.' : 'No hidden message found with this passkey.', cleanMessage ? 'success' : 'warning');
      if (cleanMessage) revealResult();
    };

    image.onerror = () => {
      setIsLoading(false);
      notify('Unable to load this image.', 'error');
    };
  };

  const download = () => {
    const content = operation === 'encrypt' ? encodedImageSrc : decodedMessage;
    if (!content) return;

    const link = document.createElement('a');
    if (operation === 'encrypt') {
      link.href = content;
      link.download = 'encoded_image.png';
    } else {
      link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
      link.download = 'decoded_message.txt';
    }
    link.click();
    trackToolAction('steganography', 'download');
  };

  const handleCloudSave = async () => {
    if (!encodedImageSrc) {
      notify('Encode an image before saving it.', 'warning');
      return;
    }

    try {
      setSaving(true);
      if (isMockerEnabled()) {
        await api.post('/api/rust/textimage', { encrypted_image_link: encodedImageSrc });
        trackToolAction('steganography', 'save');
        notify('Encoded image saved to mock history. The passkey was not stored.', 'success');
        return;
      }

      await api.post('/api/rust/textimage', { encrypted_image_link: encodedImageSrc });
      trackToolAction('steganography', 'save');
      notify('Encoded image saved. The passkey was not stored.', 'success');
    } catch (error) {
      notify(error.message || 'Unable to save encoded image.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <Stack spacing={3}>
        <SectionHeader
          eyebrow="Image message workflow"
          title="Steganography"
          description="Hide a message inside an image or recover one with a passkey you keep locally."
        />
        <Alert severity="info" sx={{ borderRadius: 2 }}>Passkeys are used locally and are not saved to Krypt history.</Alert>
        <SurfacePanel>
          <Stack spacing={3}>
            <Tabs value={operation} onChange={(event, value) => { setOperation(value); setDecodedMessage(''); setEncodedImageSrc(''); }}>
              <Tab value="encrypt" label="Encode" />
              <Tab value="decrypt" label="Decode" />
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
                  {operation === 'encrypt' ? (
                    <TextField label="Message to hide" multiline minRows={6} fullWidth value={message} onChange={(event) => setMessage(event.target.value)} />
                  ) : null}
                  <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
                    Select image
                    <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                  </Button>
                  <TextField label="Passkey" type="password" fullWidth value={passkey} onChange={(event) => setPasskey(event.target.value)} />
                  <Button variant="contained" onClick={operation === 'encrypt' ? encodeMessage : decodeMessage} disabled={isLoading}>
                    {isLoading ? <CircularProgress size={22} /> : operation === 'encrypt' ? 'Hide Message' : 'Decode Message'}
                  </Button>
                </Stack>
              </Box>
              <Box ref={resultRef} sx={{ scrollMarginTop: { xs: 2, md: 0 } }} role="region" aria-label="Steganography result">
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">Result</Typography>
                    <Chip size="small" label={resultReady ? 'Ready' : 'Waiting'} color={resultReady ? 'success' : 'default'} />
                  </Stack>
                  {imageSrc ? (
                    <Box component="img" src={encodedImageSrc || imageSrc} alt="Steganography preview" sx={{ width: '100%', maxHeight: 340, objectFit: 'contain', bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
                  ) : (
                    <Box sx={{ minHeight: 300, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'text.secondary', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                      Image preview appears here.
                    </Box>
                  )}
                  {decodedMessage ? <Alert severity="success">{decodedMessage}</Alert> : null}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button startIcon={<DownloadIcon />} onClick={download} disabled={!encodedImageSrc && !decodedMessage}>
                      Download
                    </Button>
                    <Button startIcon={<SaveIcon />} onClick={handleCloudSave} disabled={saving || !encodedImageSrc}>
                      {saving ? 'Saving...' : 'Save encoded image'}
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

export default Steganography;
