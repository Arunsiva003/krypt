import React from 'react';
import { Box, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';

const proofPoints = [
  {
    icon: <LockOutlinedIcon fontSize="small" />,
    label: 'Keys stay local',
  },
  {
    icon: <VisibilityOffOutlinedIcon fontSize="small" />,
    label: 'Passwords never returned',
  },
  {
    icon: <ShieldOutlinedIcon fontSize="small" />,
    label: 'Mock or real backend',
  },
];

const AuthLayout = ({ children, title, subtitle }) => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'stretch',
      bgcolor: 'background.default',
    }}
  >
    <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', py: { xs: 4, md: 6 } }}>
      <Grid container spacing={{ xs: 3, md: 6 }} alignItems="center">
        <Grid item xs={12} md={6}>
          <Stack spacing={4}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 2,
                    color: 'primary.contrastText',
                    bgcolor: 'primary.main',
                  }}
                >
                  <ShieldOutlinedIcon />
                </Box>
                <Typography variant="h5">Krypt</Typography>
              </Stack>
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontSize: { xs: 42, md: 62 },
                  maxWidth: 620,
                }}
              >
                A sharper workspace for encryption workflows.
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 18, lineHeight: 1.7, maxWidth: 560 }}>
                Work with encrypted text, transformed images, and steganography history from a clean interface that keeps sensitive keys out of storage.
              </Typography>
            </Stack>
            <Grid container spacing={1.5}>
              {proofPoints.map((item) => (
                <Grid item xs={12} sm={4} key={item.label}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      minHeight: 92,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 2,
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(18,30,45,0.78)' : 'rgba(255,255,255,0.72)',
                      backdropFilter: 'blur(16px)',
                    }}
                  >
                    <Box color="secondary.main">{item.icon}</Box>
                    <Typography variant="body2" fontWeight={750}>
                      {item.label}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 3,
              boxShadow: 6,
            }}
          >
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Typography variant="h4" component="h2">
                {title}
              </Typography>
              <Typography color="text.secondary">{subtitle}</Typography>
            </Stack>
            {children}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  </Box>
);

export default AuthLayout;
