import React from 'react';

const Banner = () => {
  const heroSectionStyle = {
    background: '#222',
    color: '#fff',
    padding: '80px 0',
    textAlign: 'center',
  };

  const titleStyle = {
    fontSize: '3em',
    fontWeight: 'bold',
    color:'white',
    marginBottom: '20px',
  };

  const subtitleStyle = {
    fontSize: '1.5em',
    marginBottom: '30px',
  };

  const buttonStyle = {
    padding: '10px 20px',
    fontSize: '1.2em',
    background: '#61dafb',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  };

  return (
    <div style={heroSectionStyle}>
      <h1 style={titleStyle}>Welcome to My Website</h1>
      <p style={subtitleStyle}>
        Explore amazing content and discover new experiences.
      </p>
      <button style={buttonStyle}>Get Started</button>
    </div>
  );
};

export default Banner;
