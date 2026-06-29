import React from 'react';
import { IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import ComputerOutlinedIcon from '@mui/icons-material/ComputerOutlined';
import { useThemeMode } from './ThemeModeProvider';

const options = [
  { value: 'system', label: 'System', icon: <ComputerOutlinedIcon fontSize="small" /> },
  { value: 'light', label: 'Light', icon: <LightModeOutlinedIcon fontSize="small" /> },
  { value: 'dark', label: 'Dark', icon: <DarkModeOutlinedIcon fontSize="small" /> },
];

const ThemeToggle = () => {
  const { mode, resolvedMode, setMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const Icon = resolvedMode === 'dark' ? DarkModeOutlinedIcon : LightModeOutlinedIcon;

  return (
    <>
      <Tooltip title="Theme">
        <IconButton onClick={(event) => setAnchorEl(event.currentTarget)} aria-label="Theme">
          <Icon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {options.map((option) => (
          <MenuItem
            key={option.value}
            selected={mode === option.value}
            onClick={() => {
              setMode(option.value);
              setAnchorEl(null);
            }}
          >
            <Stack direction="row" spacing={1.2} alignItems="center">
              {option.icon}
              <Typography>{option.label}</Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ThemeToggle;
