import React, { useState } from 'react';
import { Alert, Box, Button, Chip, Grid, Stack, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import api from '../../api/client';
import { decryptTextPackage, encryptTextPackage, randomBase64 } from '../../cryptoUtils';
import { useFeedback } from '../Feedback/FeedbackProvider';
import PageShell from '../Layout/PageShell';
import SectionHeader from '../Layout/SectionHeader';
import SurfacePanel from '../Layout/SurfacePanel';

const generateRandomKey = () => randomBase64(24);

const TextEncrypt = () => {
  const [text, setText] = useState('');
  const [key, setKey] = useState(generateRandomKey());
  const [encryptedText, setEncryptedText] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { notify } = useFeedback();
  const outputValue = encryptedText || decryptedText;
  const outputFileName = encryptedText ? 'encrypted_text.krypt.json' : 'decrypted_text.txt';

  const handleEncrypt = async () => {
    if (!text.trim() || !key.trim()) {
      notify('Enter text and a key before encrypting.', 'warning');
      return;
    }
    try {
      setProcessing(true);
      const encrypted = await encryptTextPackage(text, key, { tool: 'text-encryption' });
      setEncryptedText(JSON.stringify(encrypted, null, 2));
      setDecryptedText('');
      notify('Text encrypted with AES-GCM. Keep your key safe; Krypt does not store it.', 'success');
    } catch {
      notify('Unable to encrypt this text in your browser.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecrypt = async () => {
    if (!text.trim() || !key.trim()) {
      notify('Paste encrypted text and enter the key before decrypting.', 'warning');
      return;
    }
    try {
      setProcessing(true);
      const pkg = JSON.parse(text);
      setDecryptedText(await decryptTextPackage(pkg, key));
      setEncryptedText('');
      notify('Text decrypted.', 'success');
    } catch {
      notify('Unable to decrypt this AES-GCM package with the provided key.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const copy = async (value) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    notify('Copied to clipboard.', 'success');
  };

  const download = (fileName, content) => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  const handleCloudSave = async () => {
    if (!encryptedText) {
      notify('Encrypt text before saving it.', 'warning');
      return;
    }
    try {
      setSaving(true);
      await api.post('/api/rust/text', { encrypted_text: encryptedText });
      notify('Encrypted text saved. The key was not stored.', 'success');
    } catch (err) {
      notify(err.response?.data?.error || 'Unable to save encrypted text.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <Stack spacing={3}>
        <SectionHeader
          eyebrow="Local text workflow"
          title="Text Encryption"
          description="Encrypt or decrypt text in the browser, then copy, download, or save encrypted output to your history."
          action={<Chip color="success" label="Key never stored" />}
        />
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Krypt encrypts with AES-GCM in your browser and saves encrypted output only. Your key is never persisted.
        </Alert>
        <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
          <Grid item xs={12} md={6}>
            <SurfacePanel sx={{ height: '100%' }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6">Input</Typography>
                  <Typography variant="body2" color="text.secondary">Paste plain text to encrypt, or encrypted text to decrypt.</Typography>
                </Box>
                <TextField
                  label="Input text"
                  multiline
                  minRows={8}
                  fullWidth
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label="Encryption key"
                    fullWidth
                    value={key}
                    onChange={(event) => setKey(event.target.value)}
                  />
                  <Button variant="outlined" onClick={() => setKey(generateRandomKey())}>
                    Generate
                  </Button>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button variant="contained" onClick={handleEncrypt} disabled={processing}>Encrypt</Button>
                  <Button variant="outlined" onClick={handleDecrypt} disabled={processing}>Decrypt</Button>
                </Stack>
              </Stack>
            </SurfacePanel>
          </Grid>
          <Grid item xs={12} md={6}>
            <SurfacePanel sx={{ minHeight: 405 }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="h6">Output</Typography>
                  <Chip size="small" label={encryptedText ? 'Encrypted' : decryptedText ? 'Decrypted' : 'Waiting'} />
                </Stack>
                <TextField
                  multiline
                  minRows={8}
                  fullWidth
                  value={outputValue}
                  placeholder="Your result will appear here."
                  InputProps={{ readOnly: true }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button startIcon={<ContentCopyIcon />} onClick={() => copy(outputValue)} disabled={!outputValue}>
                    Copy
                  </Button>
                  <Button startIcon={<DownloadIcon />} onClick={() => download(outputFileName, outputValue)} disabled={!outputValue}>
                    Download
                  </Button>
                  <Button startIcon={<SaveIcon />} onClick={handleCloudSave} disabled={saving || !encryptedText}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </Stack>
            </SurfacePanel>
          </Grid>
        </Grid>
      </Stack>
    </PageShell>
  );
};

export default TextEncrypt;
