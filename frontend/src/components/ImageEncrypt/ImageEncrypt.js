// import React, { useState } from 'react';
// import ChaosMap from 'chaosmap';

// const ImageEncryptor = () => {
//   const [image, setImage] = useState(null);
//   const [key, setKey] = useState('');
//   const [encryptedImage, setEncryptedImage] = useState(null);

//   const handleImageChange = (e) => {
//     const file = e.target.files[0];
//     const reader = new FileReader();

//     reader.onload = (event) => {
//       const img = new Image();
//       img.src = event.target.result;
//       img.onload = () => {
//         setImage(img);
//         setEncryptedImage(null);
//       };
//     };

//     reader.readAsDataURL(file);
//   };

//   const handleKeyChange = (e) => {
//     setKey(e.target.value);
//   };

//   const chaoticXOR = (pixel, key, chaosKey) => {
//     const encryptedValue = pixel ^ key ^ chaosKey;
//     return encryptedValue;
//   };

//   const encryptImage = () => {
//     if (!image || !key) {
//       alert('Please select an image and enter a key.');
//       return;
//     }

//     const chaosMap = new ChaosMap.Lorenz();

//     const canvas = document.createElement('canvas');
//     const ctx = canvas.getContext('2d');
//     canvas.width = image.width;
//     canvas.height = image.height;
//     ctx.drawImage(image, 0, 0, image.width, image.height);

//     const imageData = ctx.getImageData(0, 0, image.width, image.height);
//     const data = imageData.data;

//     for (let i = 0; i < data.length; i += 4) {
//       const chaosKey = chaosMap.encrypt(i, key); // Use chaos map for generating dynamic key
//       data[i] = chaoticXOR(data[i], key, chaosKey);
//       data[i + 1] = chaoticXOR(data[i + 1], key, chaosKey);
//       data[i + 2] = chaoticXOR(data[i + 2], key, chaosKey);
//     }

//     ctx.putImageData(imageData, 0, 0);
//     const encryptedDataURL = canvas.toDataURL('image/png');
//     setEncryptedImage(encryptedDataURL);
//   };

//   const decryptImage = () => {
//     if (!image || !key) {
//       alert('Please select an image and enter a key.');
//       return;
//     }

//     const chaosMap = new ChaosMap.Lorenz();

//     const canvas = document.createElement('canvas');
//     const ctx = canvas.getContext('2d');
//     canvas.width = image.width;
//     canvas.height = image.height;
//     ctx.drawImage(image, 0, 0, image.width, image.height);

//     const imageData = ctx.getImageData(0, 0, image.width, image.height);
//     const data = imageData.data;

//     for (let i = 0; i < data.length; i += 4) {
//       const chaosKey = chaosMap.encrypt(i, key); // Use chaos map for generating dynamic key
//       data[i] = chaoticXOR(data[i], key, chaosKey);
//       data[i + 1] = chaoticXOR(data[i + 1], key, chaosKey);
//       data[i + 2] = chaoticXOR(data[i + 2], key, chaosKey);
//     }

//     ctx.putImageData(imageData, 0, 0);
//     const decryptedDataURL = canvas.toDataURL('image/png');
//     setEncryptedImage(decryptedDataURL);
//   };

//   return (
//     <div>
//       <input type="file" onChange={handleImageChange} />
//       <br />
//       <label>
//         Enter Key:
//         <input type="text" value={key} onChange={handleKeyChange} />
//       </label>
//       <br />
//       <button onClick={encryptImage}>Encrypt Image</button>
//       <button onClick={decryptImage}>Decrypt Image</button>
//       <br />
//       {image && <img src={image.src} alt="Original" />}
//       {encryptedImage && <img src={encryptedImage} alt="Encrypted/Decrypted" />}
//     </div>
//   );
// };

// export default ImageEncryptor;
