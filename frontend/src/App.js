import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './pages/Login/login'
import SignUp from './pages/SignUp/SignUp';
import Home from './pages/Home/Home';
import Navbar from './components/Navbar/Navbar';
import Krypt from './pages/Krypt/Krypt';

// const theme = createTheme({
//   palette: {
//     primary: {
//       main: 'white', // Adjust the primary color as needed
//     },
//     background: {
//       default: '#000000', // Set the background color to black
//     },
//     text: {
//       primary: '#ffffff', // Set the text color to white
//     },
//   },
// });

function App() {
  return (
    // <ThemeProvider theme={theme}>
      // <CssBaseline />
      <Router>
        <div className='App'>
          <Navbar />
          <div className='content'>
            <Routes>
              <Route path='/login' element={<Login />} />
              <Route path='/signup' element={<SignUp />} />
              <Route path='/' element={<Home />} />
              <Route path='/krypt/:name' element={<Krypt />} />
              {/* Add a default route or a 404 page if needed */}
              <Route path='*' element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </Router>
    // </ThemeProvider>
  );
}

// Example 404 (Not Found) component
const NotFound = () => {
  return <div>404 - Not Found</div>;
};

export default App;
