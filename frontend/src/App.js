import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Login from './pages/Login/login'
import SignUp from './pages/SignUp/SignUp';
import Landing from './pages/Landing/Landing';
import ToolGuide from './pages/ToolGuide/ToolGuide';
import Home from './pages/Home/Home';
import Navbar from './components/Navbar/Navbar';
import Krypt from './pages/Krypt/Krypt';
import UserContext from './UserContext';
import ImageEncrypt from "./components/ImageEncrypt/ImageEncrypt";
import ProfileComponent from './pages/Profile/Profile';
import Encryptions from './components/Encryptions/Encryptions';
import { ThemeModeProvider } from './components/ThemeModeProvider';
import Suggestions from './pages/Suggestions/Suggestions';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useContext(UserContext);
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useContext(UserContext);
  return isAuthenticated ? <Navigate to="/home" replace /> : children;
};

const ScrollToTop = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [hash, pathname]);

  return null;
};

function App() {
  return (
    <ThemeModeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <AppFrame />
      </Router>
    </ThemeModeProvider>
  );
}

const AppFrame = () => {
  const { isAuthenticated } = useContext(UserContext);
  const location = useLocation();
  const publicPaths = ['/', '/login', '/signup'];
  const showWorkspaceNav = isAuthenticated && !publicPaths.includes(location.pathname);

  return (
    <div className='App'>
      {showWorkspaceNav ? <Navbar /> : null}
      <div className='content'>
        <Routes>
          <Route path='/' element={isAuthenticated ? <Navigate to="/home" replace /> : <Landing />} />
          <Route path='/login' element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path='/signup' element={<PublicOnlyRoute><SignUp /></PublicOnlyRoute>} />
          <Route path='/tools' element={<ToolGuide />} />
          <Route path='/home' element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path='/krypt/:name' element={<ProtectedRoute><Krypt /></ProtectedRoute>} />
          <Route path='/imagek' element={<ProtectedRoute><ImageEncrypt /></ProtectedRoute>} />
          <Route path='/profile' element={<ProtectedRoute><ProfileComponent /></ProtectedRoute>} />
          <Route path='/suggestions' element={<ProtectedRoute><Suggestions /></ProtectedRoute>} />
          <Route path='/encryptions' element={<ProtectedRoute><Encryptions /></ProtectedRoute>} />
          <Route path='/dashboard' element={<ProtectedRoute><Encryptions /></ProtectedRoute>} />
          <Route path='*' element={<Navigate to={isAuthenticated ? '/home' : '/'} replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
