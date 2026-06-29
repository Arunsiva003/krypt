import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import PublicNav from '../../components/PublicNav';
import SectionHeader from '../../components/Layout/SectionHeader';
import ToolCardGrid from '../../components/Tools/ToolCardGrid';
import FeedbackSection from '../../components/Feedback/FeedbackSection';
import { labTools, mvpTools, secondaryTools } from '../../toolCatalog';

const trustItems = [
  { icon: <LockOutlinedIcon />, title: 'Keys stay local', text: 'Krypt designs every workflow so passphrases remain with the user.' },
  { icon: <VisibilityOffOutlinedIcon />, title: 'Plaintext avoided', text: 'Saved records store ciphertext, receipts, and metadata instead of secrets.' },
  { icon: <VerifiedUserOutlinedIcon />, title: 'Clear receipts', text: 'Tools explain what happened, what was stored, and what the user must protect.' },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <PublicNav />
      <Box
        component="section"
        sx={{
          minHeight: { xs: 'auto', md: 'calc(100vh - 72px)' },
          color: 'white',
          bgcolor: (theme) => theme.palette.krypt.hero,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          '&:before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.24)}, transparent 38%), radial-gradient(circle at 78% 22%, ${alpha(theme.palette.krypt.accent, 0.18)}, transparent 30%)`,
          },
        }}
      >
        <Container maxWidth="xl" sx={{ position: 'relative', py: { xs: 7, md: 9 } }}>
          <Grid container spacing={{ xs: 5, md: 7 }} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack spacing={3} maxWidth={860}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label="Browser-first security workspace" sx={{ bgcolor: 'rgba(45,212,191,0.16)', color: '#99f6e4' }} />
                  <Chip label="No keys stored" variant="outlined" sx={{ color: '#dbeafe', borderColor: 'rgba(219,234,254,0.35)' }} />
                </Stack>
                <Typography variant="h1" sx={{ fontSize: { xs: 46, sm: 64, md: 86 }, maxWidth: 940 }}>
                  Krypt
                </Typography>
                <Typography variant="h2" component="p" sx={{ fontSize: { xs: 30, md: 52 }, maxWidth: 880 }}>
                  A premium workspace for private tools, encrypted handoffs, and safer sharing.
                </Typography>
                <Typography sx={{ color: 'rgba(241,245,249,0.78)', lineHeight: 1.75, fontSize: { xs: 17, md: 20 }, maxWidth: 720 }}>
                  Explore encryption, steganography, secure notes, metadata cleanup, risk scanning, and handoff workflows without turning the product into a cluttered toolbox.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button variant="contained" color="primary" size="large" endIcon={<ArrowForwardIcon />} onClick={() => document.getElementById('mvp-tools')?.scrollIntoView({ behavior: 'smooth' })}>
                    Explore tools
                  </Button>
                  <Button variant="outlined" size="large" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} component={RouterLink} to="/login">
                    Sign in
                  </Button>
                </Stack>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(18px)' }}>
                <Stack spacing={2.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.7)' }} variant="body2">Workspace map</Typography>
                      <Typography variant="h5" sx={{ color: 'white' }}>Private by design</Typography>
                    </Box>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(45,212,191,0.16)', color: '#99f6e4' }}>
                      <ShieldOutlinedIcon />
                    </Box>
                  </Stack>
                  {[
                    ['MVP tools', '4 focused workflows'],
                    ['Secondary tools', '6 practical helpers'],
                    ['Labs', '3 memorable experiments'],
                  ].map(([label, value]) => (
                    <Box key={label} sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.68)' }}>{label}</Typography>
                      <Typography variant="h6" sx={{ color: 'white' }}>{value}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box id="mvp-tools" component="section" sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="xl">
          <SectionHeader eyebrow="Core product" title="Start with the MVP workflows" description="Krypt keeps the existing high-value tools prominent, then layers secondary workflows underneath." />
          <ToolCardGrid items={mvpTools} />
        </Container>
      </Box>

      <Box component="section" sx={{ py: { xs: 6, md: 8 }, bgcolor: 'background.paper', borderBlock: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="xl">
          <SectionHeader eyebrow="Secondary tools" title="More power, still organized" description="Practical additions for file privacy, integrity checks, secure notes, and safer sharing." />
          <ToolCardGrid items={secondaryTools} compact />
        </Container>
      </Box>

      <Box component="section" sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="xl">
          <SectionHeader eyebrow="Labs" title="Out-of-the-box privacy workflows" description="Memorable tools that make Krypt feel more like a security lab than a generic utility site." />
          <ToolCardGrid items={labTools} compact />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
            <Button variant="contained" onClick={() => navigate('/tools')}>Open interactive guide</Button>
            <Button variant="outlined" onClick={() => navigate('/signup')}>Create account</Button>
          </Stack>
        </Container>
      </Box>

      <Box id="trust" component="section" sx={{ py: { xs: 6, md: 8 }, bgcolor: 'background.paper', borderBlock: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="xl">
          <SectionHeader eyebrow="Trust model" title="Calm, explicit security signals" description="Premium security design works when the interface is restrained, predictable, and honest about what it does." />
          <Grid container spacing={2.5}>
            {trustItems.map((item) => (
              <Grid item xs={12} md={4} key={item.title}>
                <Paper elevation={0} sx={{ p: 3, height: '100%' }}>
                  <Stack spacing={2}>
                    <Box sx={{ color: 'primary.main', '& svg': { fontSize: 32 } }}>{item.icon}</Box>
                    <Typography variant="h5">{item.title}</Typography>
                    <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>{item.text}</Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <FeedbackSection />
    </Box>
  );
};

export default Landing;
