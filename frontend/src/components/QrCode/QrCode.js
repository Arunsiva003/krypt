import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { Alert, Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { trackToolAction } from '../../analytics';
import { decryptTextPackage, encryptTextPackage } from '../../cryptoUtils';
import useMobileResultReveal from '../../hooks/useMobileResultReveal';
import PageShell from '../Layout/PageShell';
import SectionHeader from '../Layout/SectionHeader';
import SurfacePanel from '../Layout/SurfacePanel';
import { useFeedback } from '../Feedback/FeedbackProvider';

const QRCodeComponent = () => {
  const [message, setMessage] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [encryptedMessage, setEncryptedMessage] = useState('');
  const [decryptedMessage, setDecryptedMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const { notify } = useFeedback();
  const { resultRef, revealResult } = useMobileResultReveal();
  const resultReady = Boolean(encryptedMessage || decryptedMessage);

  const encryptMessage = async () => {
    if (!message.trim() || !secretKey.trim()) {
      notify('Enter a message and secret key before encrypting.', 'warning');
      return;
    }

    try {
      setProcessing(true);
      const encrypted = await encryptTextPackage(message, secretKey, { tool: 'qr-encryption' });
      setEncryptedMessage(JSON.stringify(encrypted));
      setDecryptedMessage('');
      trackToolAction('qr-encryption', 'generate');
      notify('Encrypted QR payload generated with AES-GCM.', 'success');
      revealResult();
    } catch {
      notify('Unable to encrypt this QR payload.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const decryptMessage = async () => {
    if (!message.trim() || !secretKey.trim()) {
      notify('Paste an encrypted payload and enter the secret key.', 'warning');
      return;
    }

    try {
      setProcessing(true);
      const decrypted = await decryptTextPackage(JSON.parse(message), secretKey);
      setDecryptedMessage(decrypted);
      setEncryptedMessage('');
      trackToolAction('qr-encryption', 'decrypt');
      notify('Payload decrypted.', 'success');
      revealResult();
    } catch {
      setDecryptedMessage('');
      notify('Unable to decrypt this AES-GCM payload with this key.', 'warning');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <PageShell maxWidth="lg">
      <Stack spacing={3}>
        <SectionHeader
          eyebrow="Shareable payload workflow"
          title="QR Encryption"
          description="Create an AES-GCM encrypted QR payload or decrypt a pasted payload with a secret key."
        />
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          QR payloads are generated locally and are not saved to history.
        </Alert>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: { xs: 2, md: 3 },
            alignItems: 'stretch',
          }}
        >
          <Box>
            <SurfacePanel sx={{ height: '100%' }}>
              <Stack spacing={2}>
                <Typography variant="h6">Payload setup</Typography>
                <TextField
                  label="Secret key"
                  fullWidth
                  type="password"
                  value={secretKey}
                  onChange={(event) => setSecretKey(event.target.value)}
                />
                <TextField
                  label="Message or encrypted payload"
                  fullWidth
                  multiline
                  minRows={8}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button startIcon={<QrCode2OutlinedIcon />} variant="contained" onClick={encryptMessage} disabled={processing}>
                    Generate QR
                  </Button>
                  <Button startIcon={<LockOutlinedIcon />} variant="outlined" onClick={decryptMessage} disabled={processing}>
                    Decrypt
                  </Button>
                </Stack>
              </Stack>
            </SurfacePanel>
          </Box>
          <Box ref={resultRef} sx={{ scrollMarginTop: { xs: 2, md: 0 } }} role="region" aria-label="QR encryption result">
            <SurfacePanel sx={{ minHeight: 430 }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="h6">Result</Typography>
                  <Chip size="small" label={resultReady ? 'Ready' : 'Waiting'} color={resultReady ? 'success' : 'default'} />
                </Stack>
                {encryptedMessage ? (
                  <Box
                    sx={{
                      display: 'grid',
                      placeItems: 'center',
                      p: 3,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <QRCode value={encryptedMessage} size={220} />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      minHeight: 280,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      color: 'text.secondary',
                      border: '1px dashed',
                      borderColor: 'divider',
                      textAlign: 'center',
                      px: 3,
                    }}
                  >
                    Generate an encrypted QR code or decrypt a payload to preview the result here.
                  </Box>
                )}
                {decryptedMessage ? <Alert severity="success">{decryptedMessage}</Alert> : null}
              </Stack>
            </SurfacePanel>
          </Box>
        </Box>
      </Stack>
    </PageShell>
  );
};

export default QRCodeComponent;
