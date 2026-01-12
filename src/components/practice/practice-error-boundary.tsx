"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type PracticeErrorBoundaryProps = {
  children: ReactNode;
};

type PracticeErrorBoundaryState = {
  error: Error | null;
};

export class PracticeErrorBoundary extends Component<
  PracticeErrorBoundaryProps,
  PracticeErrorBoundaryState
> {
  state: PracticeErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PracticeErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("PracticeErrorBoundary caught an error", error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    const isSqlRelated = /duckdb|sql/i.test(error.message);
    const heading = isSqlRelated ? "DuckDB / SQL issue" : "Something went wrong";
    const description = isSqlRelated
      ? "We hit a DuckDB/SQL error while rendering the editor. Review the query or reload to try again."
      : "An unexpected error occurred while rendering this panel.";

    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-900">{heading}</p>
            <p className="text-xs text-red-700">{description}</p>
          </div>
        </div>
        <p className="text-xs text-red-700/90 font-mono break-words">{error.message}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={this.reset}>
            Try again
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    );
  }
}
