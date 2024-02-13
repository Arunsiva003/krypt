import React, { useState, useEffect, useContext } from 'react';
import { Typography, Grid, Card, CardContent, Button, Container, CircularProgress } from '@mui/material';
import UserContext from '../../UserContext';
import axios from 'axios';


const SteganographyEncryptions = () => {
  const [encryptions, setEncryptions] = useState([]); 
  const {user} = useContext(UserContext);
  const [isLoading,setIsLoading] = useState(true);
  console.log("in dash",user.id)

  useEffect(() => {

    const fetchData = async () => {
      try {
        const response = axios.get(`https://rustbackend.onrender.com/api/rust/textimage/${user.id}`)
        .then((res)=>setEncryptions(res.data));
      } catch (error) {
        console.error('Error fetching encryption data:', error);
      }
    };
    fetchData();
  }, []);

  const handleDownload = async (encryptedImageLink) => {
    try {
      const response = await fetch(encryptedImageLink);
      const blob = await response.blob();
  
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'encrypted_image.png'; // Set the default filename for the downloaded image
      link.click();
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('An error occurred while downloading the image. Please try again.');
    }
  };
  
  
  console.log("isl;",isLoading);
  return (
    <Container maxWidth="lg" style={{ padding: '20px' }}>
      <Typography variant="h4" align="center" gutterBottom>
        Steganography Encryptions
      </Typography>
      {/* {isLoading &&<CircularProgress size={30}/>} */}
      <Grid container spacing={2}>
        {encryptions.length!=0?
        (encryptions.map((encryption) => (
          <Grid item xs={12} sm={6} md={4} key={encryption.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">Image</Typography>
                <img src={encryption.encrypted_image_link} alt="Encrypted Image" style={{ width: '100%' }} />
                <Typography variant="body1">Key Used: {encryption.key_used}</Typography>
                <Button variant="contained" onClick={() => handleDownload(encryption.encrypted_image_link)}>Download</Button>
              </CardContent>
            </Card>
          </Grid>
        ))) :
        <p>No Data</p>
        }
      </Grid>
    </Container>
  );
};

export default SteganographyEncryptions;
