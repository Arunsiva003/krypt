import React, { useContext, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, FormControlLabel, Grid, Link, Stack, TextField, Typography } from '@mui/material';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import api, { isMockerEnabled } from '../../api/client';
import UserContext from '../../UserContext';
import { useFeedback } from '../../components/Feedback/FeedbackProvider';
import AuthLayout from '../../components/Layout/AuthLayout';
import GoogleAuthButton from '../../components/GoogleAuthButton';

export default function SignUp() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setAuth } = useContext(UserContext);
  const { notify } = useFeedback();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    const data = new FormData(event.currentTarget);
    const firstName = data.get('firstName');
    const lastName = data.get('lastName');
    const email = data.get('email');
    const username = data.get('username');
    const password = data.get('password');

    try {
      const response = await api.post('/api/rust/users', {
        firstname: firstName,
        lastname: lastName,
        username,
        email,
        password,
      });
      setAuth(response.data);
      notify('Account created. Welcome to Krypt.', 'success');
      navigate('/home', { replace: true });
    } catch (err) {
      notify(err.response?.data?.error || 'Unable to create account', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Set up a private workspace for encrypted artifacts and tool history.">
      <Stack component="form" onSubmit={handleSubmit} spacing={2.2} noValidate>
        {isMockerEnabled() ? (
          <Alert severity="info">
            Mock mode is active. Signup creates a browser-local account only.
          </Alert>
        ) : null}
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <TextField autoComplete="given-name" name="firstName" required fullWidth id="firstName" label="First name" autoFocus />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField autoComplete="family-name" name="lastName" required fullWidth id="lastName" label="Last name" />
          </Grid>
          <Grid item xs={12}>
            <TextField autoComplete="username" name="username" required fullWidth id="username" label="Username" />
          </Grid>
          <Grid item xs={12}>
            <TextField autoComplete="email" name="email" required fullWidth id="email" label="Email address" />
          </Grid>
          <Grid item xs={12}>
            <TextField
              autoComplete="new-password"
              name="password"
              required
              fullWidth
              type="password"
              id="password"
              label="Password"
              helperText="Use at least 8 characters."
            />
          </Grid>
        </Grid>
        <FormControlLabel control={<Checkbox value="remember" color="primary" />} label="Keep me signed in" />
        <Button
          type="submit"
          fullWidth
          size="large"
          variant="contained"
          startIcon={<PersonAddAltOutlinedIcon />}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating workspace...' : 'Create workspace'}
        </Button>
        <GoogleAuthButton label="Sign up with Google" />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" underline="hover" fontWeight={750}>
              Sign in
            </Link>
          </Typography>
        </Box>
      </Stack>
    </AuthLayout>
  );
}
