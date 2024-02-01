import React, { useState } from 'react';
import { BsCloudUpload } from 'react-icons/bs';

import './Steganography.css';

const Steganography = () => {
  const [message, setMessage] = useState('');
  const [imageSrc, setImageSrc] = useState('');
  const [decodedMessage, setDecodedMessage] = useState('');
  const [encodedImageSrc, setEncodedImageSrc] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [operation, setOperation] = useState("encrypt");
  const [showDownloadButton, setShowDownloadButton] = useState(false);
  const [passkey, setPasskey] = useState('');

  const encodeMessage = async () => {
    try {
      setIsLoading(true);

      // Check if passkey is provided
      if (!passkey) {
        alert('Please enter a passkey.');
        setIsLoading(false);
        return;
      }

      const image = new Image();
      image.src = imageSrc;

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = image.width;
        canvas.height = image.height;

        context.drawImage(image, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        const msgLen = message.length;
        let prefix = `{${msgLen}}`;
        setMessage(prefix + message);

        const binaryMessage = (prefix + message)
          .split('')
          .map((char) => char.charCodeAt(0).toString(2).padStart(8, '0'))
          .join('');

        // Use passkey for additional encryption
        const passkeyBinary = passkey
          .split('')
          .map((char) => char.charCodeAt(0).toString(2).padStart(8, '0'))
          .join('');

        for (let i = 0; i < binaryMessage.length; i++) {
          pixels[i * 4] = (pixels[i * 4] & 0b11111110) | ((parseInt(binaryMessage[i], 2) + parseInt(passkeyBinary[i % passkeyBinary.length], 2)) % 2);
        }

        context.putImageData(imageData, 0, 0);

        setEncodedImageSrc(canvas.toDataURL('image/png'));

        // Display download button
        setShowDownloadButton(true);

        setIsLoading(false);
      };

      image.onerror = () => {
        setIsLoading(false);
        alert('Error loading the image. Please choose a valid image file.');
      };
    } catch (error) {
      console.error('Error during encoding:', error);
      alert('An error occurred during encoding. Please try again.');
      setIsLoading(false);
    }
  };

  const decodeMessage = async () => {
    try {
      setIsLoading(true);

      // Check if passkey is provided
      if (!passkey) {
        alert('Please enter a passkey.');
        setIsLoading(false);
        return;
      }

      const image = new Image();
      image.src = imageSrc;

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = image.width;
        canvas.height = image.height;

        context.drawImage(image, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        let binaryMessage = '';
        for (let i = 0; i < pixels.length; i += 4) {
          binaryMessage += (pixels[i] & 1).toString();
        }

        // Use passkey for decryption
        const passkeyBinary = passkey
          .split('')
          .map((char) => char.charCodeAt(0).toString(2).padStart(8, '0'))
          .join('');

        let decryptedBinaryMessage = '';
        for (let i = 0; i < binaryMessage.length; i++) {
          decryptedBinaryMessage += ((parseInt(binaryMessage[i], 2) - parseInt(passkeyBinary[i % passkeyBinary.length], 2)) + 2) % 2;
        }

        let message = '';
        for (let i = 0; i < decryptedBinaryMessage.length; i += 8) {
          message += String.fromCharCode(parseInt(decryptedBinaryMessage.slice(i, i + 8), 2));
        }

        let match = message.match(/\{(\d+)\}/);
        let msgLen = match ? parseInt(match[1], 10) : null;

        let stringWithoutNums = message.replace(/\{\d+\}/g, '');
        stringWithoutNums = stringWithoutNums.slice(0, msgLen);
        setDecodedMessage(stringWithoutNums);

        // Display download button
        setShowDownloadButton(true);

        setIsLoading(false);
      };

      image.onerror = () => {
        setIsLoading(false);
        alert('Error loading the image. Please choose a valid image file.');
      };
    } catch (error) {
      console.error('Error during decoding:', error);
      alert('An error occurred during decoding. Please try again.');
      setIsLoading(false);
    }
  };

  const handleImageDownload = () => {
    // Redirect to success page for download

    window.location.href = '/success';
    const link = document.createElement('a');
    link.href = encodedImageSrc;
    link.download = 'encoded_image.png';
    link.click();
  };

  const handleTextDownload = () => {
    window.location.href = '/success';
    const blob = new Blob([decodedMessage], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'decoded_message.txt';
    link.click();
  }

  const handleOperationChange = (selectedOperation) => {
    setOperation(selectedOperation);
    setDecodedMessage('');
    setShowDownloadButton(false);
  };

  return (
    <div className="steganography-container">
      <h1>React Steganography</h1>
      <div className="operation-buttons">
        <button
          className={`operation-button ${operation === 'encrypt' ? 'active' : ''}`}
          onClick={() => handleOperationChange('encrypt')}
        >
          Encrypt
        </button>
        <button
          className={`operation-button ${operation === 'decrypt' ? 'active' : ''}`}
          onClick={() => handleOperationChange('decrypt')}
        >
          Decrypt
        </button>
      </div>
      {operation && (
        <>
          <div>
            <label>{operation === 'encrypt' ? 'Enter Message:' : 'Choose Image:'}</label>
            {operation === 'encrypt' ? (
              <div>
                <textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                  }}
                />
                <div className="choose-image-container">
                  <label htmlFor="choose-image" className="choose-image-label">
                    Choose Image:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    id="choose-image"
                    className="choose-image-input"
                    onChange={(e) => setImageSrc(URL.createObjectURL(e.target.files[0]))}
                  />
                  <label htmlFor="choose-image" className="choose-image-button">
                    <BsCloudUpload style={{ marginRight: '8px' }} />
                    Select Image e
                  </label>
                </div>
              </div>
            ) : (
              <div className="drop-container">
                <span className="drop-title">Drop files here</span>
                OR
                <input
                  type="file"
                  accept="image/*"
                  id="choose-image"
                  className="choose-image-input"
                  onChange={(e) => setImageSrc(URL.createObjectURL(e.target.files[0]))}
                />
                <label htmlFor="choose-image" className="choose-image-button">
                  <BsCloudUpload style={{ marginRight: '8px' }} />
                  Select Image d
                </label>
              </div>
            )}
          </div>
          <div style={{margin:"10px"}}>
            <label>Passkey: </label>
            <input
              type="password"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
            />
          </div>
          <div className='operationButton'>
            <button
              onClick={operation === 'encrypt' ? encodeMessage : decodeMessage}
              disabled={isLoading}
              >
              {isLoading ? `${operation === 'encrypt' ? 'Encrypting...' : 'Decrypting...'}` : operation === 'encrypt' ? 'Encrypt Message' : 'Decrypt Message'}
            </button>
            {showDownloadButton && (
              <button onClick={operation === "encrypt" ? handleImageDownload : handleTextDownload} className="download-button">
                Download
              </button>
            )}
          </div>
          {decodedMessage && <div>Decoded Message: {decodedMessage}</div>}
          {imageSrc && decodedMessage && (
            <img
              src={imageSrc}
              alt={operation === 'encrypt' ? 'Encrypted Image' : 'Decrypted Image'}
              className="result-image"
            />
          )}
        </>
      )}
    </div>
  );
};

export default Steganography;
