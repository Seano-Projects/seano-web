import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
          <h3 className="text-red-800 dark:text-red-400 font-semibold mb-2">
            Something went wrong
          </h3>
          <p className="text-red-600 dark:text-red-300 text-sm mb-3">
            {this.state.error && this.state.error.toString()}
          </p>
          <button
            onClick={() =>
              this.setState({ hasError: false, error: null, errorInfo: null })
            }
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            Try again
          </button>
          {import.meta.env.DEV && (
            <details className="mt-3 text-xs text-red-500 dark:text-red-400">
              <summary>Error details (development only)</summary>
              <pre className="whitespace-pre-wrap mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded">
                {this.state.error && this.state.error.stack}
                <br />
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
export { ErrorBoundary };
