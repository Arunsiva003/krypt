import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import './App.css';
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
import Analytics from './pages/Analytics/Analytics';
import { trackEvent } from './analytics';
import { isOwnerUser } from './adminAccess';

const RouteLoading = () => (
  <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
    <CircularProgress size={30} />
  </Box>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAuthLoading } = useContext(UserContext);
  if (isAuthLoading) return <RouteLoading />;
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

const OwnerRoute = ({ children }) => {
  const { isAuthenticated, isAuthLoading, user } = useContext(UserContext);
  if (isAuthLoading) return <RouteLoading />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return isOwnerUser(user) ? children : <Navigate to="/home" replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isAuthLoading } = useContext(UserContext);
  if (isAuthLoading) return <RouteLoading />;
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

const AnalyticsTracker = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    trackEvent('page_view', {
      eventGroup: 'navigation',
      path: pathname,
      metadata: hash ? { anchor: hash.replace('#', '') } : {},
    });
  }, [hash, pathname]);

  return null;
};

function App() {
  return (
    <ThemeModeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <AnalyticsTracker />
        <AppFrame />
      </Router>
    </ThemeModeProvider>
  );
}

const AppFrame = () => {
  const { isAuthenticated, isAuthLoading } = useContext(UserContext);
  const location = useLocation();
  const publicPaths = ['/', '/login', '/signup'];
  const showWorkspaceNav = isAuthenticated && !publicPaths.includes(location.pathname);

  return (
    <div className='App'>
      {showWorkspaceNav ? <Navbar /> : null}
      <div className={showWorkspaceNav ? 'content with-workspace-nav' : 'content'}>
        <Routes>
          <Route path='/' element={isAuthLoading ? <RouteLoading /> : isAuthenticated ? <Navigate to="/home" replace /> : <Landing />} />
          <Route path='/login' element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path='/signup' element={<PublicOnlyRoute><SignUp /></PublicOnlyRoute>} />
          <Route path='/tools' element={<ToolGuide />} />
          <Route path='/home' element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path='/krypt/:name' element={<ProtectedRoute><Krypt /></ProtectedRoute>} />
          <Route path='/imagek' element={<ProtectedRoute><ImageEncrypt /></ProtectedRoute>} />
          <Route path='/profile' element={<ProtectedRoute><ProfileComponent /></ProtectedRoute>} />
          <Route path='/suggestions' element={<OwnerRoute><Suggestions /></OwnerRoute>} />
          <Route path='/analytics' element={<OwnerRoute><Analytics /></OwnerRoute>} />
          <Route path='/encryptions' element={<ProtectedRoute><Encryptions /></ProtectedRoute>} />
          <Route path='/dashboard' element={<ProtectedRoute><Encryptions /></ProtectedRoute>} />
          <Route path='*' element={<Navigate to={isAuthenticated ? '/home' : '/'} replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
