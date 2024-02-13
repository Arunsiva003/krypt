import React, { useState } from 'react';
import { Container, Typography, Button, Grid, Badge } from '@mui/material';
import { Link } from 'react-router-dom';
import SteganographyEncyptions from '../../components/Dashboard/SteganographyEncryptions';
import TextEncyryptions from '../Dashboard/TextEncryptions';
import ImageEncryptions from '../Dashboard/ImageEncryptionsSection';

function Encryptions() {
  const [encType, setEncType] = useState(0);
  const [steganographyCount, setSteganographyCount] = useState(10); // Example count values
  const [textEncryptionCount, setTextEncryptionCount] = useState(20); // Example count values
  const [imageEncryptionCount, setImageEncryptionCount] = useState(15); // Example count values

  return (
    <Container>
      <Typography variant="h4" align="center" gutterBottom>
        Welcome to Your Dashboard
      </Typography>
      <Grid container spacing={4} justifyContent="center">
        <Grid item>
          <Button
            onClick={() => setEncType(1)}
            className={encType === 1 ? 'active' : ''}
          >
            <Badge badgeContent={steganographyCount} color="primary">
              Steganography Dashboard
            </Badge>
          </Button>
        </Grid>
        <Grid item>
          <Button
            onClick={() => setEncType(3)}
            className={encType === 3 ? 'active' : ''}
          >
            <Badge badgeContent={textEncryptionCount} color="primary">
              Text Encryption Dashboard
            </Badge>
          </Button>
        </Grid>
        <Grid item>
          <Button
            onClick={() => setEncType(2)}
            className={encType === 2 ? 'active' : ''}
          >
            <Badge badgeContent={imageEncryptionCount} color="primary">
              Image Encryption Dashboard
            </Badge>
          </Button>
        </Grid>
      </Grid>
      {encType === 0 ? null : encType === 1 ? (
        <SteganographyEncyptions />
      ) : encType === 2 ? (
        <ImageEncryptions />
      ) : encType === 3 ? (
        <TextEncyryptions />
      ) : null}
    </Container>
  );
}

export default Encryptions;
