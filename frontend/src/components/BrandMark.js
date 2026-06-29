import React from 'react';
import { Box } from '@mui/material';

const BrandMark = ({ size = 38 }) => (
  <Box
    component="img"
    src="/krypt-mark.svg"
    alt=""
    aria-hidden="true"
    sx={{
      width: size,
      height: size,
      display: 'block',
      flexShrink: 0,
      borderRadius: '8px',
      boxShadow: '0 12px 30px rgba(15, 118, 110, 0.22)',
    }}
  />
);

export default BrandMark;
