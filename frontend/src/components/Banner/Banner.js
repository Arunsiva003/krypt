import React from 'react';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { Box, Button, Chip, Container, Grid, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';

const metrics = [
  { label: 'Keys stored', value: '0', icon: <KeyOutlinedIcon /> },
  { label: 'Private histories', value: '3', icon: <StorageOutlinedIcon /> },
  { label: 'Auth protected', value: 'JWT', icon: <ShieldOutlinedIcon /> },
];

const Banner = () => {
  const navigate = useNavigate();
  const scrollToTools = () => {
    document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box
      component="section"
      sx={{
        color: '#f8fafc',
        py: { xs: 5, md: 7 },
        bgcolor: '#0b1f2a',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
          <Grid item xs={12} md={7}>
            <Stack spacing={3} maxWidth={840}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label="Privacy-first workspace" sx={{ bgcolor: 'rgba(16,185,129,0.16)', color: '#a7f3d0' }} />
                <Chip
                  label="Browser-side cryptography tools"
                  variant="outlined"
                  sx={{ color: '#dbeafe', borderColor: 'rgba(219,234,254,0.35)' }}
                />
              </Stack>
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontSize: { xs: 42, sm: 54, md: 72 },
                  maxWidth: 840,
                }}
              >
                Encryption tools that feel ready for{' '}
                <Box component="span" sx={{ color: '#8eeadf' }}>
                  real work.
                </Box>
              </Typography>
              <Typography sx={{ color: 'rgba(241,245,249,0.78)', lineHeight: 1.75, fontSize: { xs: 17, md: 19 }, maxWidth: 680 }}>
                Encrypt text, transform images, hide messages, and review saved artifacts in one focused product surface.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="contained" color="secondary" size="large" endIcon={<ArrowForwardIcon />} onClick={scrollToTools}>
                  Open tools
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.28)' }}
                  onClick={() => navigate('/dashboard')}
                >
                  View dashboard
                </Button>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3 },
                bgcolor: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.16)',
                backdropFilter: 'blur(18px)',
              }}
            >
              <Stack spacing={3}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.72)' }} variant="body2">
                      Workspace status
                    </Typography>
                    <Typography variant="h5" sx={{ color: 'white' }}>
                      Secure session active
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 2,
                      bgcolor: 'rgba(16,185,129,0.16)',
                      color: '#a7f3d0',
                    }}
                  >
                    <ShieldOutlinedIcon />
                  </Box>
                </Stack>
                <Stack spacing={1.4}>
                  {[
                    ['Route protection', 96],
                    ['Ownership checks', 92],
                    ['Key privacy', 100],
                  ].map(([label, value]) => (
                    <Box key={label}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.7 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                          {label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 800 }}>
                          {value}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={value}
                        sx={{
                          height: 8,
                          borderRadius: 999,
                          bgcolor: 'rgba(255,255,255,0.1)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 999,
                            bgcolor: value === 100 ? '#10b981' : '#60a5fa',
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
                <Grid container spacing={1.5}>
                  {metrics.map((metric) => (
                    <Grid item xs={4} key={metric.label}>
                      <Box
                        sx={{
                          p: 1.5,
                          minHeight: 104,
                          borderRadius: 2,
                          bgcolor: alpha('#ffffff', 0.08),
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        <Box sx={{ color: '#bfdbfe', mb: 1 }}>{metric.icon}</Box>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          {metric.value}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.62)' }}>
                          {metric.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Banner;
