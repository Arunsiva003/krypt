import React, { useState, useContext } from 'react';
import { TextField, Button, TextareaAutosize, Divider, Typography, Paper, Grid, Container, Modal, Box } from '@mui/material';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import UserContext from '../../UserContext';
import axios from 'axios';

const TextEncrypt = () => {
  const [text, setText] = useState('');
  const [key, setKey] = useState(generateRandomKey());
  const [encryptedText, setEncryptedText] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [showFullModal, setShowFullModal] = useState(false);
  const [fullText, setFullText] = useState('');
  const {user} = useContext(UserContext);

  function generateRandomKey(length = 16) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < length; i++) {
      key += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return key;
  }

  const handleTextChange = (event) => {
    setText(event.target.value);
  };

  const handleKeyChange = (event) => {
    setKey(event.target.value);
  };

  const handleEncrypt = () => {
    const encrypted = encryptText(text, key);
    setEncryptedText(encrypted);
    setFullText(encrypted);
  };

  const handleDecrypt = () => {
    const decrypted = decryptText(text, key);
    setDecryptedText(decrypted);
    setFullText(decrypted);
  };

  const handleCopyToClipboard = (textAreaId) => {
    const textArea = document.getElementById(textAreaId);
    textArea.select();
    document.execCommand('copy');
  };

  const encryptText = (plainText, encryptionKey) => {
    let encrypted = '';
    for (let i = 0; i < plainText.length; i++) {
      const charCode = plainText.charCodeAt(i);
      const keyChar = encryptionKey.charCodeAt(i % encryptionKey.length);
      const encryptedCharCode = (charCode + keyChar) % 256; // One-time pad
      encrypted += String.fromCharCode(encryptedCharCode);
    }
    console.log(encrypted);
    return btoa(encrypted); // Base64 encode for better representation
  };

  const decryptText = (cipherText, decryptionKey) => {
    console.log("cipher:", cipherText);
    const decodedCipherText = atob(cipherText);
    let decrypted = '';
    for (let i = 0; i < decodedCipherText.length; i++) {
      const charCode = decodedCipherText.charCodeAt(i);
      const keyChar = decryptionKey.charCodeAt(i % decryptionKey.length);
      const decryptedCharCode = (charCode - keyChar + 256) % 256; // One-time pad
      decrypted += String.fromCharCode(decryptedCharCode);
    }
    return decrypted;
  };

  const handleDownload = (fileName, content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };


  const handleCloudSave = async () => {      
    try{
      const response =  axios.post('http://localhost:8080/api/rust/text',{
        user_id:user.id,
        username:user.username,
        encrypted_text:encryptedText,
        key_used:key
      });
      console.log(response);
      alert("Data saved");
    }catch(err){
      console.log(err);
    }
  }

  const handleViewFull = () => {
    setShowFullModal(true);
  };

  const handleCloseFullModal = () => {
    setShowFullModal(false);
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} style={{ padding: '20px', margin: '20px', textAlign: 'center' }}>
        <Typography variant="h4">Text Encryption & Decryption</Typography>
        <Divider style={{ margin: '20px 0' }} />
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12}>
            <TextField
              label="Enter Text"
              variant="outlined"
              multiline
              rows={6}
              fullWidth
              value={text}
              onChange={handleTextChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Enter Encryption/Decryption Key"
              variant="outlined"
              fullWidth
              value={key}
              onChange={handleKeyChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Button variant="contained" onClick={handleEncrypt} fullWidth>
              Encrypt
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <Button variant="contained" onClick={handleDecrypt} fullWidth>
              Decrypt
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Divider style={{ margin: '20px 0' }} />
            <Typography variant="h6">Results</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextareaAutosize
              placeholder="Encrypted Text"
              value={encryptedText}
              id="encryptedTextArea"
              readOnly
              style={{ width: '100%', height: '200px'}}
            />
            <Button
              variant="outlined"
              onClick={() => handleCopyToClipboard('encryptedTextArea')}
              startIcon={<FileCopyIcon />}
              style={{ margin: '10px 0' , border:'none'}}
            >
              
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleDownload('encrypted_text.txt', encryptedText)}
              style={{ margin: '10px 0' }}
            >
              Download Encrypted Text
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextareaAutosize
              placeholder="Decrypted Text"
              value={decryptedText}
              id="decryptedTextArea"
              readOnly
              style={{ width: '100%', height:'200px' }}
            />
          <Grid item xs={12}>
            {fullText.length > 20 && (
              <>
                <Typography variant="body2">
                  {fullText.substring(0, 20)}
                  <span style={{ cursor: 'pointer', color: 'blue' }} onClick={handleViewFull}>
                    ...View Full
                  </span>
                </Typography>
                <Modal open={showFullModal} onClose={handleCloseFullModal}>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 400,
                      maxHeight: '80vh',
                      overflowY: 'auto',
                      bgcolor: 'background.paper',
                      border: '2px solid #000',
                      boxShadow: 24,
                      p: 4,
                      whiteSpace: 'pre-wrap', // Maintain line breaks and spaces
                    }}
                  >
                    <Typography variant="h6" component="h2" gutterBottom>
                      Full Text
                    </Typography>
                    <Typography variant="body2" component="div">
                      {fullText}
                    </Typography>
                  </Box>
                </Modal>
              </>
            )}
          </Grid>
            <Button
              variant="outlined"
              onClick={() => handleCopyToClipboard('decryptedTextArea')}
              startIcon={<FileCopyIcon />}
              style={{ margin: '10px 0', border:'none' }}
            >
              
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleDownload('decrypted_text.txt', decryptedText)}
              style={{ margin: '10px 0',  }}
            >
              Download Decrypted Text
            </Button>
          </Grid>
        </Grid>
        <Button onClick={handleCloudSave}>Cloud Save</Button>
      </Paper>
    </Container>
  );
};

export default TextEncrypt;



// import React, { useState } from 'react';
// import { TextField, Button, TextareaAutosize, Divider, Typography, Paper, Grid, Container } from '@mui/material';
// import FileCopyIcon from '@mui/icons-material/FileCopy';

// const TextEncrypt = () => {
//   const [text, setText] = useState('');
//   const [key, setKey] = useState(generateRandomKey());
//   const [encryptedText, setEncryptedText] = useState('');
//   const [decryptedText, setDecryptedText] = useState('');

//   function generateRandomKey(length = 16) {
//     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//     let key = '';
//     for (let i = 0; i < length; i++) {
//       key += characters.charAt(Math.floor(Math.random() * characters.length));
//     }
//     return key;
//   }

//   const handleTextChange = (event) => {
//     setText(event.target.value);
//   };

//   const handleKeyChange = (event) => {
//     setKey(event.target.value);
//   };

//   const handleEncrypt = () => {
//     const encrypted = encryptText(text, key);
//     setEncryptedText(encrypted);
//   };

//   const handleDecrypt = () => {
//     console.log(key);
//     const decrypted = decryptText(text, key);
//     console.log(decrypted);
//     setDecryptedText("decrypted:",decrypted);
//   };

//   const handleCopyToClipboard = (textAreaId) => {
//     const textArea = document.getElementById(textAreaId);
//     textArea.select();
//     document.execCommand('copy');
//   };

//   const encryptText = (plainText, encryptionKey) => {
//     let encrypted = '';
//     for (let i = 0; i < plainText.length; i++) {
//       const charCode = plainText.charCodeAt(i);
//       const keyChar = encryptionKey.charCodeAt(i % encryptionKey.length);
//       const encryptedCharCode = (charCode + keyChar) % 256; // One-time pad
//       encrypted += String.fromCharCode(encryptedCharCode);
//     }
//     console.log(encrypted);
//     return btoa(encrypted); // Base64 encode for better representation
//   };

//   const decryptText = (cipherText, decryptionKey) => {
//     console.log("cipher:", cipherText);
//     const decodedCipherText = atob(cipherText);
//     let decrypted = '';
//     for (let i = 0; i < decodedCipherText.length; i++) {
//       const charCode = decodedCipherText.charCodeAt(i);
//       const keyChar = decryptionKey.charCodeAt(i % decryptionKey.length);
//       const decryptedCharCode = (charCode - keyChar + 256) % 256; // One-time pad
//       decrypted += String.fromCharCode(decryptedCharCode);
//     }
//     return decrypted;
//   };

//   return (
//     <Container maxWidth="sm">
//       <Paper elevation={3} style={{ padding: '20px', margin: '20px', textAlign: 'center' }}>
//         <Typography variant="h4">Text Encryption & Decryption</Typography>
//         <Divider style={{ margin: '20px 0' }} />
//         <Grid container spacing={2} justifyContent="center">
//           <Grid item xs={12}>
//             <TextField
//               label="Enter Text"
//               variant="outlined"
//               multiline
//               rows={4}
//               fullWidth
//               value={text}
//               onChange={handleTextChange}
//             />
//           </Grid>
//           <Grid item xs={12}>
//             <TextField
//               label="Enter Encryption/Decryption Key"
//               variant="outlined"
//               fullWidth
//               value={key}
//               onChange={handleKeyChange}
//             />
//           </Grid>
//           <Grid item xs={12} md={6}>
//             <Button variant="contained" onClick={handleEncrypt} fullWidth>
//               Encrypt
//             </Button>
//           </Grid>
//           <Grid item xs={12} md={6}>
//             <Button variant="contained" onClick={handleDecrypt} fullWidth>
//               Decrypt
//             </Button>
//           </Grid>
//           <Grid item xs={12}>
//             <Divider style={{ margin: '20px 0' }} />
//             <Typography variant="h6">Results</Typography>
//           </Grid>
//           <Grid item xs={12} md={6}>
//             <TextareaAutosize
//               placeholder="Encrypted Text"
//               value={encryptedText}
//               id="encryptedTextArea"
//               readOnly
//               style={{ width: '100%' }}
//             />
//             <Button
//               variant="outlined"
//               startIcon={<FileCopyIcon />}
//               onClick={() => handleCopyToClipboard('encryptedTextArea')}
//               style={{ marginTop: '10px' }}
//             >
//               Copy to Clipboard
//             </Button>
//           </Grid>
//           <Grid item xs={12} md={6}>
//             <TextareaAutosize
//               placeholder="Decrypted Text"
//               value={decryptedText}
//               id="decryptedTextArea"
//               readOnly
//               style={{ width: '100%' }}
//             />
//             <Button
//               variant="outlined"
//               startIcon={<FileCopyIcon />}
//               onClick={() => handleCopyToClipboard('decryptedTextArea')}
//               style={{ marginTop: '10px' }}
//             >
//               Copy to Clipboard
//             </Button>
//           </Grid>
//         </Grid>
//       </Paper>
//     </Container>
//   );
// };

// export default TextEncrypt;
