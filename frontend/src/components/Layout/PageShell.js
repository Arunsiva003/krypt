import React from 'react';
import { Box, Container } from '@mui/material';

const PageShell = ({ children, maxWidth = 'lg', sx = {} }) => (
  <Box
    component="main"
    sx={{
      minHeight: 'calc(100vh - 72px)',
      py: { xs: 3, md: 5 },
      ...sx,
    }}
  >
    <Container maxWidth={maxWidth}>{children}</Container>
  </Box>
);

export default PageShell;
