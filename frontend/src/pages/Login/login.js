import React, { useContext, useState } from 'react';
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Checkbox, FormControlLabel, Link, Stack, TextField, Typography } from '@mui/material';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import UserContext from '../../UserContext';
import api, { isMockerEnabled } from '../../api/client';
import { useFeedback } from '../../components/Feedback/FeedbackProvider';
import AuthLayout from '../../components/Layout/AuthLayout';
import GoogleAuthButton from '../../components/GoogleAuthButton';

const Login = () => {
  const { setAuth } = useContext(UserContext);
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = data.get('email');
    const password = data.get('password');

    try {
      setIsSubmitting(true);
      const response = await api.post('/api/rust/users/login', { email, password });
      setAuth(response.data);
      notify('Signed in successfully', 'success');
      navigate('/home', { replace: true });
    } catch (err) {
      notify(err.response?.data?.error || 'Invalid email or password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Open your encrypted workspace and continue where you left off.">
      <Stack component="form" onSubmit={handleSubmit} spacing={2.2} noValidate>
        {isMockerEnabled() ? (
          <Alert severity="info">
            Mock mode is active. Use `demo@krypt.local` with the local demo passphrase.
          </Alert>
        ) : null}
        <TextField
          required
          fullWidth
          id="email"
          label="Email address"
          name="email"
          autoComplete="email"
          autoFocus
        />
        <TextField
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
        />
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <FormControlLabel control={<Checkbox value="remember" color="primary" />} label="Keep me signed in" />
          <Typography variant="body2" color="text.secondary">
            Reset coming soon
          </Typography>
        </Stack>
        <Button
          type="submit"
          fullWidth
          size="large"
          variant="contained"
          startIcon={<LoginOutlinedIcon />}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
        <GoogleAuthButton />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            New to Krypt?{' '}
            <Link component={RouterLink} to="/signup" underline="hover" fontWeight={750}>
              Create an account
            </Link>
          </Typography>
        </Box>
      </Stack>
    </AuthLayout>
  );
};

export default Login;
