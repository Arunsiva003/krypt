import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, CircularProgress, Grid, IconButton, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../../api/client';
import { useFeedback } from '../Feedback/FeedbackProvider';
import { imageArtifactDownload, triggerArtifactDownload } from './downloadArtifact';

const SteganographyEncryptions = ({ onCountChange }) => {
  const [encryptions, setEncryptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useFeedback();

  useEffect(() => {
    api.get('/api/rust/textimage')
      .then((response) => {
        setEncryptions(response.data);
        onCountChange?.(response.data.length);
      })
      .catch((error) => notify(error.response?.data?.error || 'Unable to fetch steganography history.', 'error'))
      .finally(() => setIsLoading(false));
  }, [notify, onCountChange]);

  const handleDownload = (encryptedImageLink, id) => {
    const didDownload = triggerArtifactDownload(imageArtifactDownload(encryptedImageLink, id, 'steganography'));
    if (!didDownload) {
      notify('Unable to download this image.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this saved steganography record?')) return;
    try {
      await api.delete(`/api/rust/textimage/${id}`);
      setEncryptions((items) => {
        const nextItems = items.filter((encryption) => encryption.id !== id);
        onCountChange?.(nextItems.length);
        return nextItems;
      });
      notify('Steganography record deleted.', 'success');
    } catch (error) {
      notify(error.response?.data?.error || 'Unable to delete steganography record.', 'error');
    }
  };

  if (isLoading) {
    return <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={30} /></Stack>;
  }

  if (encryptions.length === 0) {
    return <Alert severity="info">No saved steganography images yet.</Alert>;
  }

  return (
    <Grid container spacing={2}>
      {encryptions.map((encryption) => (
        <Grid item xs={12} sm={6} md={4} key={encryption.id}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Encoded Image</Typography>
                <img src={encryption.encrypted_image_link} alt="Encoded steganography result" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
                <Alert severity="info">Passkey not stored</Alert>
                <Stack direction="row" spacing={1}>
                  <Button startIcon={<DownloadIcon />} onClick={() => handleDownload(encryption.encrypted_image_link, encryption.id)}>
                    Download
                  </Button>
                  <IconButton aria-label="Delete steganography record" onClick={() => handleDelete(encryption.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default SteganographyEncryptions;
