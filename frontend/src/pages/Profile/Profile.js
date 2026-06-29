import React, { useContext, useEffect, useState } from 'react';
import { Alert, Avatar, Button, Grid, Stack, TextField } from '@mui/material';
import api from '../../api/client';
import UserContext from '../../UserContext';
import { useFeedback } from '../../components/Feedback/FeedbackProvider';
import PageShell from '../../components/Layout/PageShell';
import SectionHeader from '../../components/Layout/SectionHeader';
import SurfacePanel from '../../components/Layout/SurfacePanel';

const ProfileComponent = () => {
  const { user, setUser } = useContext(UserContext);
  const { notify } = useFeedback();
  const [userData, setUserData] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/rust/users/${user.id}`)
      .then((response) => setUserData({ ...response.data, password: '' }))
      .catch((error) => notify(error.response?.data?.error || 'Unable to load profile.', 'error'))
      .finally(() => setLoading(false));
  }, [notify, user.id]);

  const handleSave = async () => {
    try {
      const payload = {
        firstname: userData.firstname,
        lastname: userData.lastname,
      };
      if (userData.password.trim()) {
        payload.password = userData.password;
      }
      const response = await api.put(`/api/rust/users/${user.id}`, payload);
      setUser(response.data);
      setUserData({ ...response.data, password: '' });
      setEditMode(false);
      notify('Profile updated.', 'success');
    } catch (error) {
      notify(error.response?.data?.error || 'Unable to update profile.', 'error');
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setUserData((current) => ({ ...current, [name]: value }));
  };

  return (
    <PageShell maxWidth="md">
      <SectionHeader
        eyebrow="Account"
        title="Profile"
        description="Manage your public account details and password without exposing sensitive data in API responses."
      />
      <SurfacePanel sx={{ p: { xs: 3, md: 4 } }}>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={3}>
            <Stack alignItems={{ xs: 'center', md: 'flex-start' }} spacing={2}>
              <Avatar sx={{ width: 128, height: 128, bgcolor: 'primary.main', fontSize: 44 }}>
                {userData.username?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Alert severity="info">Passwords are hashed and never returned by the API.</Alert>
            </Stack>
          </Grid>
          <Grid item xs={12} md={9}>
            <Stack spacing={2}>
              <TextField
                label="First Name"
                fullWidth
                name="firstname"
                value={userData.firstname}
                onChange={handleInputChange}
                disabled={!editMode || loading}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Last Name"
                fullWidth
                name="lastname"
                value={userData.lastname}
                onChange={handleInputChange}
                disabled={!editMode || loading}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Username"
                fullWidth
                value={userData.username}
                disabled
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Email"
                fullWidth
                value={userData.email}
                disabled
                InputLabelProps={{ shrink: true }}
              />
              {editMode ? (
                <TextField
                  label="New password (optional)"
                  fullWidth
                  name="password"
                  type="password"
                  value={userData.password}
                  onChange={handleInputChange}
                  helperText="Leave blank to keep your current password. Minimum 8 characters."
                />
              ) : null}
              <Stack direction="row" spacing={1}>
                {!editMode ? (
                  <Button variant="contained" onClick={() => setEditMode(true)} disabled={loading}>
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button variant="contained" onClick={handleSave}>Save</Button>
                    <Button variant="outlined" onClick={() => { setEditMode(false); setUserData((current) => ({ ...current, password: '' })); }}>
                      Cancel
                    </Button>
                  </>
                )}
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </SurfacePanel>
    </PageShell>
  );
};

export default ProfileComponent;
