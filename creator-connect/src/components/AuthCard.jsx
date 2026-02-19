function AuthCard({ title, subtitle, children }) {
  return (
    <section className="auth-card">
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
      {children}
    </section>
  )
}

export default AuthCard
