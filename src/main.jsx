import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Application render error:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '24px', background: '#fffdf5', color: '#111' }}>
          <section style={{ width: '100%', maxWidth: '480px', padding: '24px', border: '3px solid #111', borderRadius: '24px', background: '#fff', boxShadow: '6px 6px 0 #111', textAlign: 'center' }}>
            <div aria-hidden="true" style={{ fontSize: '44px' }}>🛠️</div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: '12px 0' }}>Squad app hit a snag</h1>
            <p style={{ lineHeight: 1.6 }}>Your browser stopped rendering this screen. Reload the app to try again. Your locally saved quiz data is not intentionally cleared by this recovery screen.</p>
            <button type="button" onClick={() => window.location.reload()} style={{ marginTop: '18px', padding: '12px 18px', border: '3px solid #111', borderRadius: '12px', background: '#b8ff01', fontWeight: 900, minHeight: '44px' }}>Reload app</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
