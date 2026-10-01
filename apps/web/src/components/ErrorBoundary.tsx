import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset: () => void;
}
interface State {
  error: Error | null;
}

/** A crash inside the 3D scene must not blank the whole app (master prompt §24). */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[scene] crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash" role="alert" data-testid="crash">
        <strong>3D sahnada xato chiqdi</strong>
        <p>Sahna saqlangan. Qayta yuklab ko'ring; muammo takrorlansa, namuna sahnani tiklang.</p>
        <code>{this.state.error.message}</code>
        <div className="crash-actions">
          <button className="btn primary" onClick={() => location.reload()}>Qayta yuklash</button>
          <button className="btn" onClick={() => { this.props.onReset(); this.setState({ error: null }); }}>Namuna sahnani tiklash</button>
        </div>
      </div>
    );
  }
}
