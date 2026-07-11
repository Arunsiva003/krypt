import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';

const SectionHeader = ({ eyebrow, title, description, action, align = 'left', sx = {} }) => (
  <Stack
    spacing={1.5}
    sx={{
      mb: 3,
      textAlign: align,
      ...sx,
    }}
  >
    {eyebrow ? (
      <Box>
        <Chip size="small" color="secondary" variant="outlined" label={eyebrow} />
      </Box>
    ) : null}
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: align === 'center' ? 'center' : 'flex-start', md: 'flex-end' }}
    >
      <Box maxWidth={760}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: 30, sm: 34, md: 38 }, lineHeight: 1.12 }}>
          {title}
        </Typography>
        {description ? (
          <Typography color="text.secondary" sx={{ mt: 1, fontSize: { xs: 15, md: 16 }, lineHeight: 1.65 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {action || null}
    </Stack>
  </Stack>
);

export default SectionHeader;
