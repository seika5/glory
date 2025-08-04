export default function Home() {
  return (
    <div>
      <h1>Glory Web Backend API</h1>
      <p>API endpoints:</p>
      <ul>
        <li>GET /api/inventory - Get user inventory</li>
        <li>POST /api/add-material - Add random material</li>
        <li>POST /api/init-user - Initialize user document</li>
        <li>POST /api/craft-request - Process craft request</li>
      </ul>
    </div>
  )
}