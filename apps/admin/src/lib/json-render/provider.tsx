"use client";

/**
 * JSON-Render Provider
 *
 * Provides the component catalog and rendering capabilities
 * throughout the admin application.
 *
 * Self-contained implementation - no external dependencies required.
 */

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { adminCatalog } from "./catalog";

// =============================================================================
// TYPES
// =============================================================================

export interface JsonSchema {
  type: string;
  props?: Record<string, unknown>;
  children?: JsonSchema | JsonSchema[];
}

interface JsonRenderContextValue {
  /** Render a JSON schema to React components */
  renderJson: (schema: JsonSchema) => ReactNode;
  /** Set the current JSON schema */
  setSchema: (schema: JsonSchema | null) => void;
  /** Current JSON schema */
  schema: JsonSchema | null;
  /** Data bindings for the rendered components */
  data: Record<string, unknown>;
  /** Update data bindings */
  setData: (data: Record<string, unknown>) => void;
  /** Handle actions from components */
  onAction: (action: string, payload?: unknown) => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const JsonRenderContext = createContext<JsonRenderContextValue | null>(null);

// =============================================================================
// RENDER FUNCTION
// =============================================================================

/**
 * Renders a JSON schema to React components using the catalog
 */
function renderSchema(
  schema: JsonSchema | JsonSchema[],
  catalog: typeof adminCatalog,
  data: Record<string, unknown>,
  _onAction: (action: string, payload?: unknown) => void
): ReactNode {
  // Handle arrays
  if (Array.isArray(schema)) {
    return schema.map((item, index) => (
      <div key={`${item.type}-${index}`}>{renderSchema(item, catalog, data, _onAction)}</div>
    ));
  }

  // Get component definition from catalog
  const componentDef = catalog[schema.type as keyof typeof catalog];

  if (!componentDef) {
    console.warn(`[JsonRender] Unknown component type: ${schema.type}`);
    return (
      <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
        Unknown component: {schema.type}
      </div>
    );
  }

  // Extract props and children
  const { props = {}, children } = schema;

  // Render children if present
  let renderedChildren: ReactNode = null;
  if (children) {
    renderedChildren = renderSchema(children, catalog, data, _onAction);
  }

  // Get the component
  const Component = componentDef.component as React.ComponentType<Record<string, unknown>>;

  // Render the component
  return <Component {...props}>{renderedChildren}</Component>;
}

// =============================================================================
// PROVIDER
// =============================================================================

interface AdminJsonRenderProviderProps {
  children: ReactNode;
}

export function AdminJsonRenderProvider({ children }: AdminJsonRenderProviderProps) {
  const [schema, setSchema] = useState<JsonSchema | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});

  // Handle actions from rendered components
  const handleAction = useCallback((_action: string, _payload?: unknown) => {
    // Action handler - extend as needed
  }, []);

  // Render function using the catalog
  const renderJson = useCallback(
    (schemaToRender: JsonSchema): ReactNode => {
      return renderSchema(schemaToRender, adminCatalog, data, handleAction);
    },
    [data, handleAction]
  );

  const contextValue: JsonRenderContextValue = {
    renderJson,
    setSchema,
    schema,
    data,
    setData,
    onAction: handleAction,
  };

  return <JsonRenderContext.Provider value={contextValue}>{children}</JsonRenderContext.Provider>;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to access JSON-Render capabilities
 */
export function useAdminJsonRender() {
  const context = useContext(JsonRenderContext);
  if (!context) {
    throw new Error("useAdminJsonRender must be used within AdminJsonRenderProvider");
  }
  return context;
}

/**
 * Hook to render a JSON schema directly
 */
export function useRenderJson() {
  const { renderJson } = useAdminJsonRender();
  return renderJson;
}

// =============================================================================
// COMPONENT EXPORTS
// =============================================================================

export { adminCatalog } from "./catalog";
