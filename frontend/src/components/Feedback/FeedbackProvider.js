import React, { createContext, useCallback, useContext, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

const FeedbackContext = createContext(null);

export const FeedbackProvider = ({ children }) => {
  const [message, setMessage] = useState(null);

  const notify = useCallback((text, severity = 'info') => {
    setMessage({ text, severity });
  }, []);

  const close = () => setMessage(null);

  return (
    <FeedbackContext.Provider value={{ notify }}>
      {children}
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4200}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {message ? (
          <Alert onClose={close} severity={message.severity} variant="filled" sx={{ width: '100%' }}>
            {message.text}
          </Alert>
        ) : null}
      </Snackbar>
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const value = useContext(FeedbackContext);
  if (!value) {
    return { notify: () => {} };
  }
  return value;
};
