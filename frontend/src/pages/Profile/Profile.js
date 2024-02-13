import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Avatar, Button, Container, Grid, TextField, Typography } from '@mui/material';
import UserContext from '../../UserContext';

const ProfileComponent = () => {
  const { user, setUser } = useContext(UserContext);

  const [userData, setUserData] = useState({
    profilePic: '',
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
  });

  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    // Fetch user data from the backend
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`http://localhost:8080/api/rust/users/${user.id}`);
        setUserData(response.data);
      } catch (error) {}
    };

    fetchUserData();
  }, []);

  const handleEdit = () => {
    setEditMode(true);
  };

  const updateUserProfile = async (userData) => {
    // Update user profile data in the backend
    try {
      await axios.put(`http://localhost:8080/api/rust/users/${user.id}`, userData);
      setUser(userData);
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  const handleSave = () => {
    updateUserProfile(userData);
    setEditMode(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData({ ...userData, [name]: value });
  };

  return (
    <Container maxWidth="md" style={{ marginTop: '50px' }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <Avatar src={userData.profilePic || ''} sx={{ width: 150, height: 150 }} />
        </Grid>
        <Grid item xs={12} md={9}>
          <TextField
            label="First Name"
            variant="outlined"
            fullWidth
            name="firstname"
            value={userData.firstname}
            onChange={handleInputChange}
            disabled={!editMode}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Last Name"
            variant="outlined"
            fullWidth
            name="lastname"
            value={userData.lastname}
            onChange={handleInputChange}
            disabled={!editMode}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            value={userData.username}
            InputProps={{ readOnly: true }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            value={userData.email}
            InputProps={{ readOnly: true }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Password"
            variant="outlined"
            fullWidth
            name="password"
            type="password"
            value={userData.password}
            onChange={handleInputChange}
            disabled={!editMode}
            InputLabelProps={{ shrink: true }}
          />
          {!editMode ? (
            <Button style={{ marginTop: '20px' }} variant="contained" color="primary" onClick={handleEdit}>
              Edit
            </Button>
          ) : (
            <Button variant="contained" color="primary" onClick={handleSave}>
              Save
            </Button>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProfileComponent;
