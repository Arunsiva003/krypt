import React, { useState, useEffect, useContext } from 'react';
import { Typography, Grid, Card, CardContent, Button, Container, CircularProgress, IconButton } from '@mui/material';
import UserContext from '../../UserContext';
import axios from 'axios';
import DeleteIcon from '@mui/icons-material/Delete';

const SteganographyEncryptions = () => {
  const [encryptions, setEncryptions] = useState([]); 
  const {user} = useContext(UserContext);
  const [isLoading,setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`https://rustbackend.onrender.com/api/rust/textimage/${user.id}`);
        setEncryptions(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching encryption data:', error);
      }
    };
    fetchData();
  }, [user.id]);

  const handleDownload = async (encryptedImageLink) => {
    try {
      const response = await fetch(encryptedImageLink);
      const blob = await response.blob();
  
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'encrypted_image.png';
      link.click();
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('An error occurred while downloading the image. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(`https://rustbackend.onrender.com/api/rust/textimage/${id}`);
      setEncryptions(encryptions.filter(encryption => encryption.id !== id));
      alert('Encryption deleted successfully.');
    } catch (error) {
      console.error('Error deleting encryption:', error);
      alert('An error occurred while deleting the encryption. Please try again.');
    }
  };
  
  return (
    <Container maxWidth="lg" style={{ padding: '20px' }}>
      <Typography variant="h4" align="center" gutterBottom>
        Steganography Encryptions
      </Typography>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={30} />
        </div>
      ) : (
        <Grid container spacing={2}>
          {encryptions.length !== 0 ? (
            encryptions.map((encryption) => (
              <Grid item xs={12} sm={6} md={4} key={encryption.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Image</Typography>
                    <img src={encryption.encrypted_image_link} alt="Encrypted Image" style={{ width: '100%' }} />
                    <Typography variant="body1">Key Used: {encryption.key_used}</Typography>
                    <Button variant="contained" onClick={() => handleDownload(encryption.encrypted_image_link)}>Download</Button>
                    <IconButton onClick={() => handleDelete(encryption.id)}><DeleteIcon /></IconButton>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Typography variant="body1" align="center">No Data</Typography>
          )}
        </Grid>
      )}
    </Container>
  );
};

export default SteganographyEncryptions;
