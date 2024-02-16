import React, { useState, useEffect, useContext } from 'react';
import { Typography, Grid, Card, CardContent, IconButton, Button, TextField, CircularProgress } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import UserContext from '../../UserContext';
import axios from 'axios';

const ImageEncryptionDashboard = () => {
  const [imageEncryptions, setImageEncryptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const {user} = useContext(UserContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`https://rustbackend.onrender.com/api/rust/image/${user.id}`);
        setImageEncryptions(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching image encryptions:', error);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownloadImage = (encryptedImageLink, id) => {
    const link = document.createElement('a');
    link.href = encryptedImageLink;
    link.download = `encrypted_image_${id}.png`;
    link.click();
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const toggleVisibility = (id) => {
    const keyField = document.getElementById(`key-${id}`);
    keyField.type = keyField.type === 'text' ? 'password' : 'text';
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://rustbackend.onrender.com/api/rust/image/${id}`);
      setImageEncryptions(imageEncryptions.filter(encryption => encryption.id !== id));
      alert('Encryption deleted successfully.');
    } catch (error) {
      console.error('Error deleting encryption:', error);
      alert('An error occurred while deleting the encryption. Please try again.');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" align="center" gutterBottom>
        Image Encryptions
      </Typography>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={30} />
      </div>
      ) : (
        <Grid container spacing={2}>
          { imageEncryptions.length !== 0 ? 
            imageEncryptions.map((encryption) => (
              <Grid item key={encryption.id} xs={12} sm={6} md={4} lg={3}>
                <Card style={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <ImageIcon /> Encrypted Image
                    </Typography>
                    {/* <img src={encryption.encrypted_image_link} alt="Encrypted" style={{ maxWidth: '100%', maxHeight: '200px', marginBottom: '10px' }} /> */}
                    <Typography variant="h6" gutterBottom>
                      Key Used
                    </Typography>
                    <TextField
                      id={`key-${encryption.id}`}
                      type="password"
                      value={encryption.key_used}
                      InputProps={{
                        readOnly: true,
                      }}
                    />
                    <IconButton size="small" onClick={() => toggleVisibility(encryption.id)}>
                      {encryption.showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                    <IconButton size="small" onClick={() => handleCopyToClipboard(encryption.key_used)}>
                      <FileCopyIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(encryption.id)}>
                      <DeleteIcon />
                    </IconButton>
                    <br />
                    <br />
                    <Button onClick={() => handleDownloadImage(encryption.encrypted_image_link, encryption.id)}>
                      Download Encrypted Image
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            )) :
            <p>No Data</p>
          }
        </Grid>
      )}
    </div>
  );
};

export default ImageEncryptionDashboard;
