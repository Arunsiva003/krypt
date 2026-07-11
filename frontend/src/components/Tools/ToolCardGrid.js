import React from 'react';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { Box, Card, CardActionArea, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const ToolCardGrid = ({ items, compact = false, cta = 'Open workflow', onSelect }) => {
  const navigate = useNavigate();

  return (
    <Grid container spacing={2.5}>
      {items.map((tool) => {
        const Icon = tool.icon;
        return (
          <Grid item xs={12} sm={6} lg={compact ? 4 : 3} key={tool.slug}>
            <Card
              sx={{
                height: '100%',
                overflow: 'hidden',
                transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => `0 24px 70px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.28 : 0.12)}`,
                  borderColor: tool.accent,
                },
              }}
            >
              <CardActionArea onClick={() => (onSelect ? onSelect(tool) : navigate(tool.route))} sx={{ height: '100%' }}>
                <CardContent sx={{ minHeight: { xs: compact ? 188 : 204, md: compact ? 260 : 318 }, height: '100%', display: 'flex', flexDirection: 'column', gap: { xs: 1.4, md: 2.1 }, textAlign: 'left', p: { xs: 2, md: 3 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                    <Box
                      sx={{
                        width: { xs: 44, md: 52 },
                        height: { xs: 44, md: 52 },
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: 2,
                        bgcolor: `${tool.accent}17`,
                        color: tool.accent,
                        '& svg': { fontSize: { xs: 24, md: 28 } },
                      }}
                    >
                      <Icon />
                    </Box>
                    <Chip size="small" label={tool.detail} sx={{ bgcolor: 'action.hover', maxWidth: '68%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />
                  </Stack>
                  <Box>
                    <Typography variant="h5" sx={{ mb: 0.75, fontSize: { xs: 21, md: 24 } }}>
                      {tool.name}
                    </Typography>
                    <Typography color="text.secondary" sx={{ lineHeight: 1.6, fontSize: { xs: 15, md: 16 } }}>
                      {tool.description}
                    </Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1 }} />
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      alignSelf: 'flex-start',
                      color: tool.accent,
                      px: 0,
                      fontWeight: 750,
                    }}
                  >
                    {cta}
                    <ArrowForwardIcon fontSize="small" />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default ToolCardGrid;
