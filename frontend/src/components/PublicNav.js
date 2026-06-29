import React, { useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import UserContext from '../UserContext';
import BrandMark from './BrandMark';
import ThemeToggle from './ThemeToggle';

const PublicNav = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(UserContext);

  const scrollTo = (id) => {
    if (window.location.pathname !== '/') {
      navigate(`/#${id}`);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(6, 11, 18, 0.82)' : 'rgba(249, 251, 255, 0.86)',
        backdropFilter: 'blur(18px)',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: 72 }}>
          <Stack component={RouterLink} to="/" direction="row" alignItems="center" spacing={1.2} sx={{ textDecoration: 'none', mr: { xs: 1, md: 5 } }}>
            <BrandMark />
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1 }}>
                Krypt
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Secure workspace
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            <Button color="inherit" onClick={() => scrollTo('mvp-tools')}>Tools</Button>
            <Button color="inherit" onClick={() => scrollTo('trust')}>Trust</Button>
            <Button color="inherit" component={RouterLink} to="/tools">Guide</Button>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <ThemeToggle />
            {isAuthenticated ? (
              <Button component={RouterLink} to="/home" variant="contained" endIcon={<ArrowForwardIcon />}>
                Workspace
              </Button>
            ) : (
              <>
                <Button component={RouterLink} to="/login" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                  Sign in
                </Button>
                <Button component={RouterLink} to="/signup" variant="contained" endIcon={<ArrowForwardIcon />}>
                  Start
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default PublicNav;
