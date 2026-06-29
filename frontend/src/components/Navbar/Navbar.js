import React, { useContext, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import UserContext from '../../UserContext';
import { isOwnerUser } from '../../adminAccess';
import BrandMark from '../BrandMark';
import ThemeToggle from '../ThemeToggle';

const pages = [
  { label: 'Home', path: '/home', icon: <HomeOutlinedIcon fontSize="small" /> },
  { label: 'Tools', path: '/home#tools', icon: <BuildOutlinedIcon fontSize="small" /> },
  { label: 'Guide', path: '/tools', icon: <BuildOutlinedIcon fontSize="small" /> },
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardOutlinedIcon fontSize="small" /> },
];

function Navbar() {
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const { user, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const navPages = isOwnerUser(user)
    ? [...pages, { label: 'Suggestions', path: '/suggestions', icon: <FeedbackOutlinedIcon fontSize="small" /> }]
    : pages;

  const goTo = (path) => {
    setAnchorElNav(null);
    if (path.includes('#')) {
      navigate(path.split('#')[0]);
      setTimeout(() => {
        document.getElementById(path.split('#')[1])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return;
    }
    navigate(path);
  };

  const handleUserAction = (action) => {
    setAnchorElUser(null);
    if (action === 'logout') {
      logout();
      navigate('/');
      return;
    }
    navigate(action);
  };

  const initials = user?.username?.slice(0, 1)?.toUpperCase() || 'K';

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(6, 11, 18, 0.9)' : 'rgba(249, 251, 255, 0.9)',
        backdropFilter: 'blur(18px)',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 } }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.2}
            onClick={() => navigate('/home')}
            sx={{ cursor: 'pointer', mr: { xs: 1, md: 4 } }}
          >
            <BrandMark />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="h6" sx={{ lineHeight: 1 }}>
                Krypt
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Secure workspace
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton aria-label="Open navigation" onClick={(event) => setAnchorElNav(event.currentTarget)}>
              <MenuIcon />
            </IconButton>
            <Menu anchorEl={anchorElNav} open={Boolean(anchorElNav)} onClose={() => setAnchorElNav(null)}>
              {navPages.map((page) => (
                <MenuItem key={page.label} onClick={() => goTo(page.path)}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    {page.icon}
                    <Typography>{page.label}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          <Stack direction="row" spacing={0.5} sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {navPages.map((page) => {
              const active = page.path !== '/home#tools' && location.pathname === page.path;
              return (
                <Button
                  key={page.label}
                  startIcon={page.icon}
                  onClick={() => goTo(page.path)}
                  variant={active ? 'contained' : 'text'}
                  color={active ? 'primary' : 'inherit'}
                  sx={{
                    px: 1.75,
                    color: active ? 'primary.contrastText' : 'text.secondary',
                    '&:hover': { bgcolor: active ? 'primary.dark' : 'action.hover' },
                  }}
                >
                  {page.label}
                </Button>
              );
            })}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <ThemeToggle />
            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
              <Typography variant="body2" sx={{ fontWeight: 750 }}>
                {user?.username || 'User'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Authenticated session
              </Typography>
            </Box>
            <Tooltip title="Account menu">
              <IconButton onClick={(event) => setAnchorElUser(event.currentTarget)} sx={{ p: 0 }}>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'secondary.main',
                    color: 'secondary.contrastText',
                    fontWeight: 800,
                  }}
                >
                  {initials}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorElUser}
              open={Boolean(anchorElUser)}
              onClose={() => setAnchorElUser(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => handleUserAction('/profile')}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <PersonOutlineOutlinedIcon fontSize="small" />
                  <Typography>Profile</Typography>
                </Stack>
              </MenuItem>
              <MenuItem onClick={() => handleUserAction('/dashboard')}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <DashboardOutlinedIcon fontSize="small" />
                  <Typography>Dashboard</Typography>
                </Stack>
              </MenuItem>
              {isOwnerUser(user) ? (
                <MenuItem onClick={() => handleUserAction('/suggestions')}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <FeedbackOutlinedIcon fontSize="small" />
                    <Typography>Suggestions</Typography>
                  </Stack>
                </MenuItem>
              ) : null}
              <Divider />
              <MenuItem onClick={() => handleUserAction('logout')}>
                <Stack direction="row" spacing={1.2} alignItems="center" color="error.main">
                  <LogoutOutlinedIcon fontSize="small" />
                  <Typography>Logout</Typography>
                </Stack>
              </MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navbar;
