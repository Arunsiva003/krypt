import React from 'react';
import { Paper } from '@mui/material';

const SurfacePanel = ({ children, sx = {}, ...props }) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 2.5, md: 3 },
      borderRadius: 2,
      bgcolor: 'background.paper',
      boxShadow: 3,
      ...sx,
    }}
    {...props}
  >
    {children}
  </Paper>
);

export default SurfacePanel;
