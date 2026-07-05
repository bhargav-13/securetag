export default function NotFound() {
  return (
    <main className="container">
      <div className="brand">
        <span className="dot" />
        SecureTag
      </div>
      <div className="card center">
        <h1>Tag not found</h1>
        <p className="muted">
          This QR code doesn&apos;t match any SecureTag. It may be mistyped
          or not yet issued.
        </p>
        <a className="btn small" href="/" style={{ marginTop: 16 }}>
          Go home
        </a>
      </div>
    </main>
  );
}
