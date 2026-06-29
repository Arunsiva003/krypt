import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { Alert, Box, Button, Grid, Stack, TextField, Typography } from '@mui/material';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { decryptTextPackage, encryptTextPackage } from '../../cryptoUtils';
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
      notify('Encrypted QR payload generated with AES-GCM.', 'success');
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
      notify('Payload decrypted.', 'success');
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
        <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
          <Grid item xs={12} md={6}>
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
          </Grid>
          <Grid item xs={12} md={6}>
            <SurfacePanel sx={{ minHeight: 430 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Result</Typography>
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
                    Generate an encrypted QR code to preview it here.
                  </Box>
                )}
                {decryptedMessage ? <Alert severity="success">{decryptedMessage}</Alert> : null}
              </Stack>
            </SurfacePanel>
          </Grid>
        </Grid>
      </Stack>
    </PageShell>
  );
};

export default QRCodeComponent;
