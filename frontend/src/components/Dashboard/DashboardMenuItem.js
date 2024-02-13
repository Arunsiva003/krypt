import React from 'react';
import { MenuItem, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const DashboardMenuItem = ({ setting }) => {
  const navigate = useNavigate();

  const handleItemClick = () => {
    navigate(`/${setting.toLowerCase()}`);
  };

  return (
    <MenuItem onClick={handleItemClick}>
      <Typography textAlign="center">{setting}</Typography>
    </MenuItem>
  );
};

export default DashboardMenuItem;
