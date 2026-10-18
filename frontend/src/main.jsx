import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <main className="fatal-screen">
          <h1>PastaTshield a rencontré une erreur d'affichage.</h1>
          <p>
            Rechargez la page. Vos analyses précédentes restent enregistrées
            localement.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Recharger
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
