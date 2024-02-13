import React, { useContext, useState } from 'react';
import { Tab, Tabs, TextField, Button, Typography, Container, Grid, CircularProgress } from '@mui/material';
import UserContext from '../../UserContext';
import axios from 'axios';

const XOREncryption = () => {
  const [image, setImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [key, setKey] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cloudUploadLink, setCloudUploadLink] = useState('');
  const {user} = useContext(UserContext);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (upload) => {
      setImage(upload.target.result);
      setProcessedImage(null);
      setIsEncrypted(false);
    };

    reader.readAsDataURL(file);
  };

  const handleKeyChange = (e) => {
    setKey(e.target.value);
  };

  const processImage = async (encrypt) => {
    if (image && key) {
      setProcessing(true);
      setErrorMessage('');

      try {
        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Convert base64 image to Uint8Array
        const imgData = atob(image.split(',')[1]);
        const dataArray = new Uint8Array(imgData.length);
        for (let i = 0; i < imgData.length; i++) {
          dataArray[i] = imgData.charCodeAt(i);
        }

        // Convert key to Uint8Array
        const keyData = key.split('').map((char) => char.charCodeAt(0));
        const processedArray = new Uint8Array(dataArray.length);

        // XOR encryption or decryption
        for (let i = 0; i < dataArray.length; i++) {
          processedArray[i] = dataArray[i] ^ keyData[i % keyData.length];
        }

        // Convert back to base64 and set as processed image
        const processedBase64 = btoa(String.fromCharCode.apply(null, processedArray));
        setProcessedImage(`data:image/png;base64,${processedBase64}`);
        setIsEncrypted(encrypt);
      } catch (error) {
        setErrorMessage('Please upload an image with size less than 800X600');
      } finally {
        setProcessing(false);
      }
    }
  };

  const downloadImage = () => {
    if (processedImage) {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = isEncrypted ? 'encrypted_image.png' : 'decrypted_image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleTabChange = (event, newValue) => {
    setKey('');
    setImage(null);
    setProcessedImage(null);
    setSelectedTab(newValue);
  };


  const handleCloudSave = async () => {
    try{
      const response =  axios.post('http://localhost:8080/api/rust/image',{
        user_id:user.id,
        username:user.username,
        encrypted_image_link:processedImage,
        key_used:key
      });
      console.log(response);
      alert("Data saved");
    }catch(err){
      console.log(err);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" align="center" gutterBottom>XOR Encryption</Typography>
      <Tabs value={selectedTab} onChange={handleTabChange} centered>
        <Tab label="Encrypt" />
        <Tab label="Decrypt" />
      </Tabs>
      <div>
        {selectedTab === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Encryption Key"
                variant="outlined"
                fullWidth
                value={key}
                onChange={handleKeyChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={() => processImage(true)} disabled={processing}>
                {processing ? <CircularProgress size={24} /> : 'Encrypt Image'}
              </Button>
            </Grid>
          </Grid>
        )}
        {selectedTab === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Decryption Key"
                variant="outlined"
                fullWidth
                value={key}
                onChange={handleKeyChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={() => processImage(false)} disabled={processing}>
                {processing ? <CircularProgress size={24} /> : 'Decrypt Image'}
              </Button>
            </Grid>
          </Grid>
        )}
        {errorMessage && <Typography color="error">{errorMessage}</Typography>}
        {processedImage && !errorMessage && (
          <div>
            {/* <img src={processedImage} alt={isEncrypted ? 'Encrypted' : 'Decrypted'} /> */}
            <br></br>
            <Button variant="contained" onClick={downloadImage}>
              Download {isEncrypted ? 'Encrypted' : 'Decrypted'} Image
            </Button>
          </div>
        )}
      </div>
      <Button onClick={handleCloudSave}>Cloud Save</Button>
    </Container>
  );
};

export default XOREncryption;
