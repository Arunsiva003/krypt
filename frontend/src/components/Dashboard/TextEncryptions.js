import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, CircularProgress, Grid, IconButton, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../../api/client';
import { useFeedback } from '../Feedback/FeedbackProvider';

const TextEncryptionDashboard = ({ onCountChange }) => {
  const [textEncryptions, setTextEncryptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useFeedback();

  useEffect(() => {
    api.get('/api/rust/text')
      .then((response) => {
        setTextEncryptions(response.data);
        onCountChange?.(response.data.length);
      })
      .catch((error) => notify(error.response?.data?.error || 'Unable to fetch text history.', 'error'))
      .finally(() => setIsLoading(false));
  }, [notify, onCountChange]);

  const handleDownloadTextFile = (encryptedText, id) => {
    const blob = new Blob([encryptedText], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `encrypted_text_${id}.txt`;
    link.click();
  };

  const handleCopyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
    notify('Encrypted text copied.', 'success');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this saved text encryption?')) return;
    try {
      await api.delete(`/api/rust/text/${id}`);
      setTextEncryptions((items) => {
        const nextItems = items.filter((encryption) => encryption.id !== id);
        onCountChange?.(nextItems.length);
        return nextItems;
      });
      notify('Encryption deleted.', 'success');
    } catch (error) {
      notify(error.response?.data?.error || 'Unable to delete encryption.', 'error');
    }
  };

  if (isLoading) {
    return <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={30} /></Stack>;
  }

  if (textEncryptions.length === 0) {
    return <Alert severity="info">No saved text encryptions yet.</Alert>;
  }

  return (
    <Grid container spacing={2}>
      {textEncryptions.map((encryption) => (
        <Grid item key={encryption.id} xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Encrypted Text</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                  {encryption.encrypted_text.length > 140
                    ? `${encryption.encrypted_text.substring(0, 140)}...`
                    : encryption.encrypted_text}
                </Typography>
                <Alert severity="info">Key not stored</Alert>
                <Stack direction="row" spacing={1}>
                  <IconButton aria-label="Copy encrypted text" onClick={() => handleCopyToClipboard(encryption.encrypted_text)}>
                    <ContentCopyIcon />
                  </IconButton>
                  <IconButton aria-label="Delete encrypted text" onClick={() => handleDelete(encryption.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
                <Button startIcon={<DownloadIcon />} onClick={() => handleDownloadTextFile(encryption.encrypted_text, encryption.id)}>
                  Download
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default TextEncryptionDashboard;
