import React, { useState, useEffect, useContext } from 'react';
import { Typography, Grid, Card, CardContent, TextField, IconButton, Modal, Button, Container, CircularProgress } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import axios from 'axios';
import UserContext from '../../UserContext';


const TextEncryptionDashboard = () => {
  const [textEncryptions, setTextEncryptions] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const {user} = useContext(UserContext);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = axios.get(`https://rustbackend.onrender.com/api/rust/text/${user.id}`)
        .then((res)=>setTextEncryptions(res.data));
        // const data = await response.json();
        // setTextEncryptions(data);
      } catch (error) {
        console.error('Error fetching encryption data:', error);
      }
    };
    fetchData();
  }, []);

  const handleDownloadTextFile = (encryptedText, id) => {
    const blob = new Blob([encryptedText], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `encrypted_text_${id}.txt`;
    link.click();
  };

  const handleViewFullText = (encryptedText) => {
    setSelectedText(encryptedText);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedText('');
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(selectedText);
  };

  const togglePasswordVisibility = (id) => {
    const passwordField = document.getElementById(`password-${id}`);
    passwordField.type = passwordField.type === 'text' ? 'password' : 'text';
  };

  return (
    <Container style={{ padding: '20px' }}>
      <Typography variant="h4" align="center" gutterBottom>
        Text Encryptions
      </Typography>
      <Grid container spacing={2}>

      {textEncryptions.length!=0 ? 
        (textEncryptions.map((encryption) => (
          <Grid item key={encryption.id} xs={12} sm={6} md={4} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Encrypted Text
                </Typography>
                <Typography variant="body1" paragraph>
                  {encryption.encrypted_text.length > 100
                    ? `${encryption.encrypted_text.substring(0, 100)}...`
                    : encryption.encrypted_text}
                </Typography>
                {encryption.encrypted_text.length > 100 && (
                  <IconButton size="small" onClick={() => handleViewFullText(encryption.encrypted_text)}>
                    <VisibilityIcon />
                  </IconButton>
                )}
                <Typography variant="h6" gutterBottom>
                  Key Used
                </Typography>
                <TextField
                  id={`password-${encryption.id}`}
                  type="password"
                  value={encryption.key_used}
                  InputProps={{
                    readOnly: true,
                  }}
                />
                <IconButton size="small" onClick={() => togglePasswordVisibility(encryption.id)}>
                  {encryption.showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
                <br />
                <br />
                <Button onClick={() => handleDownloadTextFile(encryption.encrypted_text, encryption.id)}>
                  Download Encrypted Text
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )))
        :
  <p>No Data</p>}
<Modal open={openModal} onClose={handleCloseModal}>
  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '20px', borderRadius: '8px', width: '50vh', maxHeight: '80vh', overflowY: 'auto' }}>
    <Typography variant="h5" gutterBottom>
      Full Encrypted Text
    </Typography>
    <div style={{ whiteSpace: 'pre-wrap', overflowY: 'auto', maxHeight: 'calc(80vh - 100px)' }}>{selectedText}</div>
    <Button onClick={handleCopyToClipboard} style={{ marginTop: '10px' }}>
      <FileCopyIcon />
      Copy to Clipboard
    </Button>
  </div>
</Modal>


      </Grid>
    </Container>
  );
};

export default TextEncryptionDashboard;
