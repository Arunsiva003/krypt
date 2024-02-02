import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './pages/Login/login'
import SignUp from './pages/SignUp/SignUp';
import Home from './pages/Home/Home';
import Navbar from './components/Navbar/Navbar';
import Krypt from './pages/Krypt/Krypt';
import UserContext from './UserContext';
import ImageEncrypt from "./components/ImageEncrypt/ImageEncrypt"


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

  const {user} = useContext(UserContext);
  const isLogged = user;
  console.log("User from app:",user);


  return (
    // <ThemeProvider theme={theme}>
      // <CssBaseline />
      <Router>
        <div className='App'>
          <Navbar />
          <div className='content'>


            {user==null ? 
              <Routes>
                  <Route path='/' element={<Login/>}/>
                  <Route path='/signup' element={<SignUp/>}/>
                  <Route path='*' element={<NotFound/>} />
              </Routes>
              :
              <Routes>
                <Route path='/' element={<Home/>} />
                <Route path='/home' element={<Home />} />
                <Route path='/krypt/:name' element={<Krypt />} />
                <Route path='/imagek' element={<ImageEncrypt />} />
                <Route path='*' element={<NotFound />} />
              </Routes>
            }
          </div>
        </div>
      </Router>
    // </ThemeProvider>
  );
}

// Example 404 (Not Found) component
const NotFound = () => {
  const navigate = useNavigate();
  navigate('/');
};

export default App;
