import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button, Divider, Stack, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useNavigate } from 'react-router-dom';
import api, { isMockerEnabled } from '../api/client';
import UserContext from '../UserContext';
import { useFeedback } from './Feedback/FeedbackProvider';

const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const GoogleAuthButton = ({ label = 'Continue with Google' }) => {
  const buttonRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(Boolean(window.google?.accounts?.id));
  const { setAuth } = useContext(UserContext);
  const { notify } = useFeedback();
  const navigate = useNavigate();

  const submitCredential = useCallback(async (credential) => {
    try {
      const response = await api.post('/api/rust/users/google', { credential });
      setAuth(response.data);
      notify('Signed in with Google.', 'success');
      navigate('/home', { replace: true });
    } catch (err) {
      notify(err.response?.data?.error || 'Google sign-in failed.', 'error');
    }
  }, [navigate, notify, setAuth]);

  useEffect(() => {
    if (!clientId || scriptReady) return undefined;
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    const script = existing || document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    if (!existing) document.body.appendChild(script);
    return undefined;
  }, [scriptReady]);

  useEffect(() => {
    if (!clientId || !scriptReady || !buttonRef.current || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => submitCredential(credential),
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      width: buttonRef.current.offsetWidth || 320,
      text: 'continue_with',
    });
  }, [scriptReady, submitCredential]);

  const mockGoogle = () => submitCredential('mock-google-credential');

  return (
    <Stack spacing={1.5}>
      <Divider>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          OR
        </Typography>
      </Divider>
      {clientId ? (
        <div ref={buttonRef} style={{ minHeight: 44, width: '100%' }} />
      ) : (
        <Button
          fullWidth
          variant="outlined"
          startIcon={<GoogleIcon />}
          onClick={isMockerEnabled() ? mockGoogle : undefined}
          disabled={!isMockerEnabled()}
        >
          {isMockerEnabled() ? label : 'Google login needs REACT_APP_GOOGLE_CLIENT_ID'}
        </Button>
      )}
    </Stack>
  );
};

export default GoogleAuthButton;
