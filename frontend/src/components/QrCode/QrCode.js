import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import CryptoJS from 'crypto-js';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

const QRCodeComponent = () => {
  const [message, setMessage] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [encryptedMessage, setEncryptedMessage] = useState('');
  const [decryptedMessage, setDecryptedMessage] = useState('');

  const encryptMessage = () => {
    if (!secretKey) {
      alert('Please enter a secret key.');
      return;
    }

    const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();
    setEncryptedMessage(encrypted);
  };

  const decryptMessage = () => {
    if (!secretKey) {
      alert('Please enter a secret key.');
      return;
    }

    const decrypted = CryptoJS.AES.decrypt(message, secretKey).toString(CryptoJS.enc.Utf8);
    setDecryptedMessage(decrypted);
  };

  return (
    <Container maxWidth="md" style={{ marginTop: '50px' }}>
      <Typography variant="h4" gutterBottom>
        QR Code Encryption and Decryption
      </Typography>
      <TextField
        label="Enter Secret Key"
        variant="outlined"
        // fullWidth
        margin="normal"
        value={secretKey}
        onChange={(e) => setSecretKey(e.target.value)}
      />
      <TextField
        label="Enter Message"
        variant="outlined"
        fullWidth
        multiline
        style={{maxHeight:"250px",overflowY:"scroll"}}
        margin="normal"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button variant="contained" color="primary" onClick={encryptMessage}>
        Encrypt
      </Button>
      <br />
      {encryptedMessage && (
        <div style={{ marginTop: '20px' }}>
          <Typography variant="h6" gutterBottom>
            Encrypted Message:
          </Typography>
          <QRCode value={encryptedMessage} />
        </div>
      )}
      <br />
      <Button variant="contained" color="primary" onClick={decryptMessage}>
        Decrypt
      </Button>
      <br />
      {decryptedMessage && (
        <div style={{ marginTop: '20px' }}>
          <Typography variant="h6" gutterBottom>
            Decrypted Message:
          </Typography>
          <Typography variant="body1">{decryptedMessage}</Typography>
        </div>
      )}
    </Container>
  );
};

export default QRCodeComponent;
