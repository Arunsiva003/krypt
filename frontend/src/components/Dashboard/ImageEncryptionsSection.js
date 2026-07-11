import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, CircularProgress, Grid, IconButton, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../../api/client';
import { useFeedback } from '../Feedback/FeedbackProvider';
import { imageArtifactDownload, triggerArtifactDownload } from './downloadArtifact';

const ImageEncryptionDashboard = ({ onCountChange }) => {
  const [imageEncryptions, setImageEncryptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useFeedback();

  useEffect(() => {
    api.get('/api/rust/image')
      .then((response) => {
        setImageEncryptions(response.data);
        onCountChange?.(response.data.length);
      })
      .catch((error) => notify(error.response?.data?.error || 'Unable to fetch image history.', 'error'))
      .finally(() => setIsLoading(false));
  }, [notify, onCountChange]);

  const handleDownloadImage = (encryptedImageLink, id) => {
    const didDownload = triggerArtifactDownload(imageArtifactDownload(encryptedImageLink, id, 'image'));
    if (!didDownload) notify('Unable to download this image package.', 'error');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this saved image encryption?')) return;
    try {
      await api.delete(`/api/rust/image/${id}`);
      setImageEncryptions((items) => {
        const nextItems = items.filter((encryption) => encryption.id !== id);
        onCountChange?.(nextItems.length);
        return nextItems;
      });
      notify('Image encryption deleted.', 'success');
    } catch (error) {
      notify(error.response?.data?.error || 'Unable to delete image encryption.', 'error');
    }
  };

  if (isLoading) {
    return <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={30} /></Stack>;
  }

  if (imageEncryptions.length === 0) {
    return <Alert severity="info">No saved image encryptions yet.</Alert>;
  }

  return (
    <Grid container spacing={2}>
      {imageEncryptions.map((encryption) => (
        <Grid item key={encryption.id} xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Encrypted Image</Typography>
                <Alert severity="info">Key not stored</Alert>
                <Button startIcon={<DownloadIcon />} onClick={() => handleDownloadImage(encryption.encrypted_image_link, encryption.id)}>
                  Download package
                </Button>
                <IconButton aria-label="Delete encrypted image" onClick={() => handleDelete(encryption.id)}>
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ImageEncryptionDashboard;
