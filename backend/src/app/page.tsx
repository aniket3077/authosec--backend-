export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚀 K Backend API</h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
        Next.js Backend Server
      </p>
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h2 style={{ marginTop: 0 }}>📡 API Endpoints:</h2>
        <ul style={{ lineHeight: '2' }}>
          <li><code>/api/health</code> - Health check</li>
          <li><code>/api/users</code> - User operations</li>
          <li><code>/api/posts</code> - Post operations</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#999' }}>
        <p>✅ Server is running</p>
        <p>🔒 CORS enabled for mobile app</p>
        <p>💾 Connected to Supabase PostgreSQL</p>
      </div>
    </div>
  );
}
