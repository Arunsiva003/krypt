import React, { useContext, useEffect, useState } from 'react';
import { Alert, Box, Chip, Divider, Skeleton, Stack, Typography } from '@mui/material';
import api from '../../api/client';
import UserContext from '../../UserContext';
import { isOwnerUser } from '../../adminAccess';
import { useFeedback } from '../../components/Feedback/FeedbackProvider';
import PageShell from '../../components/Layout/PageShell';
import SectionHeader from '../../components/Layout/SectionHeader';
import SurfacePanel from '../../components/Layout/SurfacePanel';

const formatDate = (value) => {
  if (!value) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const SuggestionItem = ({ suggestion }) => (
  <Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
      <Stack spacing={0.8}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip size="small" color="secondary" label={suggestion.type || 'suggestion'} />
          {suggestion.related_tool ? <Chip size="small" variant="outlined" label={suggestion.related_tool} /> : null}
        </Stack>
        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{suggestion.message}</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
        {formatDate(suggestion.created_at)}
      </Typography>
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }} sx={{ mt: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        From: {suggestion.name || 'Anonymous'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Email: {suggestion.email || 'Not provided'}
      </Typography>
    </Stack>
  </Box>
);

const Suggestions = () => {
  const { user } = useContext(UserContext);
  const { notify } = useFeedback();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOwnerUser(user)) {
      setLoading(false);
      setError('Owner access required.');
      return;
    }

    api.get('/api/rust/feedback')
      .then((response) => setSuggestions(response.data))
      .catch((err) => {
        const message = err.response?.data?.error || 'Unable to load suggestions.';
        setError(message);
        notify(message, 'error');
      })
      .finally(() => setLoading(false));
  }, [notify, user]);

  return (
    <PageShell maxWidth="md">
      <SectionHeader
        eyebrow="Owner inbox"
        title="Suggestions"
        description="Review feedback and tool ideas submitted from Krypt. New submissions are also sent to your configured notification email."
      />
      <SurfacePanel>
        {loading ? (
          <Stack spacing={2}>
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} variant="rounded" height={110} />
            ))}
          </Stack>
        ) : null}
        {!loading && error ? <Alert severity="warning">{error}</Alert> : null}
        {!loading && !error && suggestions.length === 0 ? (
          <Alert severity="info">No suggestions yet. The inbox is ready when the first idea arrives.</Alert>
        ) : null}
        {!loading && !error && suggestions.length > 0 ? (
          <Stack divider={<Divider flexItem />} spacing={2.5}>
            {suggestions.map((suggestion) => (
              <SuggestionItem key={suggestion.id} suggestion={suggestion} />
            ))}
          </Stack>
        ) : null}
      </SurfacePanel>
    </PageShell>
  );
};

export default Suggestions;
