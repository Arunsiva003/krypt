import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Box, Grid, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import TextSnippetOutlinedIcon from '@mui/icons-material/TextSnippetOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import HideImageOutlinedIcon from '@mui/icons-material/HideImageOutlined';
import SteganographyEncryptions from '../Dashboard/SteganographyEncryptions';
import TextEncryptions from '../Dashboard/TextEncryptions';
import ImageEncryptions from '../Dashboard/ImageEncryptionsSection';
import api from '../../api/client';
import PageShell from '../Layout/PageShell';
import SectionHeader from '../Layout/SectionHeader';
import SurfacePanel from '../Layout/SurfacePanel';

function Encryptions() {
  const [encType, setEncType] = useState('text');
  const [counts, setCounts] = useState({ text: 0, image: 0, textimage: 0 });
  const updateCount = useCallback((key, value) => {
    setCounts((current) => ({ ...current, [key]: value }));
  }, []);
  const updateTextCount = useCallback((value) => updateCount('text', value), [updateCount]);
  const updateImageCount = useCallback((value) => updateCount('image', value), [updateCount]);
  const updateTextImageCount = useCallback((value) => updateCount('textimage', value), [updateCount]);

  useEffect(() => {
    let mounted = true;
    api.get('/api/rust/encryptions/counts')
      .then((response) => {
        if (mounted) setCounts(response.data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const stats = [
    { label: 'Text records', value: counts.text, icon: <TextSnippetOutlinedIcon />, color: '#3b6df6' },
    { label: 'Image records', value: counts.image, icon: <ImageOutlinedIcon />, color: '#f59e0b' },
    { label: 'Steganography', value: counts.textimage, icon: <HideImageOutlinedIcon />, color: '#10b981' },
  ];

  return (
    <PageShell>
      <SectionHeader
        eyebrow="Private history"
        title="Encryption dashboard"
        description="Review saved encrypted artifacts. Keys are intentionally not stored in this production-hardened flow."
      />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((stat) => (
          <Grid item xs={12} md={4} key={stat.label}>
            <SurfacePanel sx={{ p: 2.4 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                  <Typography variant="h3" sx={{ mt: 0.4 }}>{stat.value}</Typography>
                </Box>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 2,
                    bgcolor: `${stat.color}17`,
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </Box>
              </Stack>
            </SurfacePanel>
          </Grid>
        ))}
      </Grid>
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs value={encType} onChange={(event, value) => setEncType(value)} variant="scrollable" scrollButtons="auto">
          <Tab value="text" label={<Badge badgeContent={counts.text} color="primary">Text</Badge>} />
          <Tab value="image" label={<Badge badgeContent={counts.image} color="primary">Image</Badge>} />
          <Tab value="textimage" label={<Badge badgeContent={counts.textimage} color="primary">Steganography</Badge>} />
        </Tabs>
      </Paper>
      {encType === 'text' ? <TextEncryptions onCountChange={updateTextCount} /> : null}
      {encType === 'image' ? <ImageEncryptions onCountChange={updateImageCount} /> : null}
      {encType === 'textimage' ? <SteganographyEncryptions onCountChange={updateTextImageCount} /> : null}
    </PageShell>
  );
}

export default Encryptions;
