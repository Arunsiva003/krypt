import React, { useContext, useState } from 'react';
import { Alert, Box, Button, Container, Grid, Paper, Stack, TextField } from '@mui/material';
import UserContext from '../../UserContext';
import api from '../../api/client';
import SectionHeader from '../Layout/SectionHeader';
import { useFeedback } from './FeedbackProvider';

const emptyFeedback = (user) => ({
  name: user ? `${user.firstname || ''} ${user.lastname || ''}`.trim() : '',
  email: user?.email || '',
  type: 'tool-idea',
  related_tool: '',
  message: '',
});

const FeedbackSection = () => {
  const { user } = useContext(UserContext);
  const { notify } = useFeedback();
  const [feedback, setFeedback] = useState(() => emptyFeedback(user));
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field) => (event) => {
    setSubmitted(false);
    setFeedback((current) => ({ ...current, [field]: event.target.value }));
  };

  const submitFeedback = async (event) => {
    event.preventDefault();
    if (!feedback.message.trim()) {
      notify('Tell us what you want Krypt to improve.', 'warning');
      return;
    }

    try {
      await api.post('/api/rust/feedback', feedback);
      setSubmitted(true);
      setFeedback((current) => ({ ...emptyFeedback(user), related_tool: current.related_tool }));
      notify('Feedback received. Thank you.', 'success');
    } catch (err) {
      notify(err.response?.data?.error || 'Unable to send feedback.', 'error');
    }
  };

  return (
    <Box id="feedback" component="section" sx={{ py: { xs: 6, md: 8 } }}>
      <Container maxWidth="md">
        <SectionHeader
          eyebrow="Feedback"
          title="Suggest the next Krypt tool"
          description="Tell us what would make this workspace more useful, safer, or more surprising."
          align="center"
        />
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack component="form" spacing={2} onSubmit={submitFeedback}>
            {submitted ? (
              <Alert severity="success">Suggestion received. Krypt will keep evolving around real user needs.</Alert>
            ) : null}
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <TextField label="Name" value={feedback.name} onChange={updateField('name')} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Email" value={feedback.email} onChange={updateField('email')} fullWidth />
              </Grid>
            </Grid>
            <TextField label="Related tool" value={feedback.related_tool} onChange={updateField('related_tool')} fullWidth />
            <TextField label="Suggestion" value={feedback.message} onChange={updateField('message')} multiline minRows={4} fullWidth required />
            <Button type="submit" variant="contained" size="large">Send suggestion</Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default FeedbackSection;
