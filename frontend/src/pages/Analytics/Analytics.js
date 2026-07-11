import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, Divider, Grid, LinearProgress, Skeleton, Stack, Typography } from '@mui/material';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import api from '../../api/client';
import UserContext from '../../UserContext';
import { isOwnerUser } from '../../adminAccess';
import { useFeedback } from '../../components/Feedback/FeedbackProvider';
import PageShell from '../../components/Layout/PageShell';
import SectionHeader from '../../components/Layout/SectionHeader';
import SurfacePanel from '../../components/Layout/SurfacePanel';

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const labelize = (value) => String(value || 'unknown').replace(/[_:-]/g, ' ');

const MetricCard = ({ icon, label, value, helper, color = 'primary.main' }) => (
  <SurfacePanel sx={{ height: '100%', boxShadow: 2 }}>
    <Stack spacing={1.3}>
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          color,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.4 }}>
          {formatNumber(value)}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {helper}
      </Typography>
    </Stack>
  </SurfacePanel>
);

const BreakdownPanel = ({ title, items, emptyText }) => {
  const max = Math.max(...items.map((item) => Number(item.count || 0)), 1);

  return (
    <SurfacePanel sx={{ height: '100%' }}>
      <Stack spacing={2}>
        <Typography variant="h6">{title}</Typography>
        {items.length === 0 ? <Alert severity="info">{emptyText}</Alert> : null}
        {items.map((item) => {
          const label = item.event_name || item.tool || item.device_type || 'unknown';
          const count = Number(item.count || 0);
          return (
            <Box key={label}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                <Typography variant="body2" sx={{ textTransform: 'capitalize', wordBreak: 'break-word' }}>
                  {labelize(label)}
                </Typography>
                <Chip size="small" label={formatNumber(count)} />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={(count / max) * 100}
                sx={{ mt: 1, height: 7, borderRadius: 1 }}
              />
            </Box>
          );
        })}
      </Stack>
    </SurfacePanel>
  );
};

const DailyPanel = ({ days }) => {
  const max = Math.max(...days.map((day) => Number(day.events || 0)), 1);

  return (
    <SurfacePanel>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
          <Typography variant="h6">7-day Activity</Typography>
          <Chip size="small" variant="outlined" label="Events and active users" />
        </Stack>
        <Stack direction="row" spacing={1.2} alignItems="flex-end" sx={{ minHeight: 170 }}>
          {days.map((day) => {
            const events = Number(day.events || 0);
            const height = Math.max((events / max) * 132, events ? 18 : 6);
            return (
              <Stack key={day.day} spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 54,
                    height,
                    borderRadius: 1,
                    bgcolor: events ? 'primary.main' : 'action.disabledBackground',
                    transition: 'height 180ms ease',
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {new Date(`${day.day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>
                  {formatNumber(events)}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </SurfacePanel>
  );
};

const metadataChips = (metadata) => Object.entries(metadata || {}).slice(0, 3);

const RecentEvents = ({ events }) => (
  <SurfacePanel>
    <Stack spacing={2}>
      <Typography variant="h6">Recent Events</Typography>
      {events.length === 0 ? <Alert severity="info">No events recorded yet.</Alert> : null}
      {events.length > 0 ? (
        <Stack divider={<Divider flexItem />} spacing={2}>
          {events.map((event) => (
            <Box key={event.id}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
                <Stack spacing={0.8}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip size="small" color="primary" label={labelize(event.event_name)} />
                    {event.tool ? <Chip size="small" variant="outlined" label={labelize(event.tool)} /> : null}
                    {metadataChips(event.metadata).map(([key, value]) => (
                      <Chip key={key} size="small" variant="outlined" label={`${labelize(key)}: ${String(value)}`} />
                    ))}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {event.username || event.email || 'Anonymous'}{event.path ? ` on ${event.path}` : ''}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {formatDate(event.created_at)}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : null}
    </Stack>
  </SurfacePanel>
);

const Analytics = () => {
  const { user } = useContext(UserContext);
  const { notify } = useFeedback();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');

    if (!isOwnerUser(user)) {
      setSummary(null);
      setLoading(false);
      setError('Owner access required.');
      return () => {
        active = false;
      };
    }

    setLoading(true);
    api.get('/api/rust/analytics/summary')
      .then((response) => {
        if (active) setSummary(response.data);
      })
      .catch((err) => {
        const message = err.response?.data?.error || 'Unable to load analytics.';
        if (active) {
          setError(message);
          notify(message, 'error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [notify, user]);

  const storageTotal = useMemo(() => {
    if (!summary?.totals) return 0;
    return summary.totals.savedText + summary.totals.savedImages + summary.totals.savedTextImages + summary.totals.notes;
  }, [summary]);

  return (
    <PageShell maxWidth="lg">
      <SectionHeader
        eyebrow="Owner dashboard"
        title="Analytics"
        description="Track signups, logins, page views, saved items, and tool interactions across Krypt."
        action={<Chip color="secondary" label="Private owner view" />}
      />

      {loading ? (
        <Stack spacing={2}>
          <Grid container spacing={2.5}>
            {[0, 1, 2, 3].map((item) => (
              <Grid key={item} item xs={12} sm={6} md={3}>
                <Skeleton variant="rounded" height={164} />
              </Grid>
            ))}
          </Grid>
          <Skeleton variant="rounded" height={280} />
        </Stack>
      ) : null}

      {!loading && error ? <Alert severity="warning">{error}</Alert> : null}

      {!loading && !error && summary ? (
        <Stack spacing={2.5}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                icon={<GroupsOutlinedIcon />}
                label="Users"
                value={summary.totals.users}
                helper={`${formatNumber(summary.activeUsers.last7Days)} active in 7 days`}
                color="secondary.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                icon={<LoginOutlinedIcon />}
                label="Logins"
                value={summary.logins.last7Days}
                helper={`${formatNumber(summary.signups.last7Days)} signups in 7 days`}
                color="success.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                icon={<QueryStatsOutlinedIcon />}
                label="Events"
                value={summary.totals.eventsLast7Days}
                helper={`${formatNumber(summary.totals.eventsToday)} recorded today`}
                color="primary.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                icon={<StorageOutlinedIcon />}
                label="Saved Items"
                value={storageTotal}
                helper={`${formatNumber(summary.totals.feedback)} feedback entries`}
                color="warning.main"
              />
            </Grid>
          </Grid>

          <DailyPanel days={summary.dailyEvents || []} />

          <Grid container spacing={2.5}>
            <Grid item xs={12} md={4}>
              <BreakdownPanel
                title="Top Events"
                items={summary.eventBreakdown || []}
                emptyText="Events will appear after users start navigating or using tools."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <BreakdownPanel
                title="Top Tools"
                items={summary.toolBreakdown || []}
                emptyText="Tool activity will appear after tracked actions are used."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <BreakdownPanel
                title="Devices"
                items={summary.deviceBreakdown || []}
                emptyText="Device mix appears after page views are tracked."
              />
            </Grid>
          </Grid>

          <RecentEvents events={summary.recentEvents || []} />
        </Stack>
      ) : null}
    </PageShell>
  );
};

export default Analytics;
