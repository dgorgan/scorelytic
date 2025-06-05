import React from 'react';

const Loader = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1000,
    }}
  >
    <img src="/scorelytic-logo.png" alt="Scorelytic Logo" style={{ width: 80, marginBottom: 32 }} />
    <div
      style={{
        border: '6px solid #e5e7eb',
        borderTop: '6px solid #2563eb',
        borderRadius: '50%',
        width: 56,
        height: 56,
        animation: 'spin 1s linear infinite',
        marginBottom: 24,
      }}
    />
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    <div style={{ color: '#2563eb', fontWeight: 600, fontSize: 20 }}>
      Loading Scorelytic Dashboard…
    </div>
  </div>
);

export default Loader;
