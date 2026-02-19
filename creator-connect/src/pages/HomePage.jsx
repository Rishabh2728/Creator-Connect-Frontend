function HomePage({ onLogout }) {
  return (
    <section className="auth-card">
      <h1>Home</h1>
      <p className="subtitle">Welcome to Creator Connect.</p>
      <p>Home Page</p>
      <button type="button" onClick={onLogout}>
        Logout
      </button>
    </section>
  )
}

export default HomePage
