/**
 * Local Type Declarations for @elizaos/core
 *
 * This file provides type declarations for @elizaos/core as a workaround
 * for the broken types in the published npm package (v1.7.0).
 *
 * The published package's .d.ts files reference source files that don't
 * exist in the distributed package, causing TypeScript compilation to fail.
 *
 * TODO: Remove this file once @elizaos/core publishes correct type declarations.
 */

declare module "@elizaos/core" {
  // ============================================================================
  // Core Types
  // ============================================================================

  export type UUID = string;

  export interface Memory {
    id?: string;
    userId?: string;
    agentId?: string;
    roomId?: string;
    content: Content;
    embedding?: number[];
    createdAt?: number;
    unique?: boolean;
  }

  export interface Content {
    text?: string;
    source?: string;
    actions?: string[];
    thought?: string;
    error?: boolean;
    [key: string]: unknown;
  }

  export interface State {
    values: Record<string, unknown>;
    data: Record<string, unknown>;
    text?: string;
  }

  // ============================================================================
  // Character
  // ============================================================================

  export interface Character {
    name: string;
    bio?: string | string[];
    personality?: string;
    style?: {
      all?: string[];
      chat?: string[];
      post?: string[];
    };
    [key: string]: unknown;
  }

  // ============================================================================
  // Runtime
  // ============================================================================

  export interface IAgentRuntime {
    agentId: string;
    character?: Character;
    getSetting(key: string): string | undefined;
    setSetting(key: string, value: string, secret?: boolean): void;
    delete?(key: string): Promise<void> | void;
    useModel(modelType: string, options: ModelOptions): Promise<string>;
    registerModel?(type: string, handler: ModelHandler): void;
    route?: (routeId: string) => RouteHandler | undefined;
    getService<T extends Service>(serviceType: string): T | undefined;
  }

  export interface ModelOptions {
    prompt: string;
    temperature?: number;
    maxTokens?: number;
  }

  export type ModelHandler = (
    runtime: IAgentRuntime,
    params: GenerateTextParams
  ) => Promise<string>;

  export interface GenerateTextParams {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    context?: string;
  }

  // ============================================================================
  // Routing
  // ============================================================================

  export type RouteHandler = (
    request: RouteRequest,
    response: RouteResponse
  ) => Promise<void> | void;

  export interface RouteRequest {
    path: string;
    method: string;
    headers?: Record<string, string>;
    body?: unknown;
    params?: Record<string, string>;
    query?: Record<string, string>;
  }

  export interface RouteResponse {
    status(code: number): RouteResponse;
    json(data: unknown): void;
    send(data: string | Buffer): void;
    setHeader(name: string, value: string): void;
  }

  // ============================================================================
  // Actions
  // ============================================================================

  export interface Action {
    name: string;
    similes?: string[];
    description: string;
    examples?: ActionExample[][];
    validate: (runtime: IAgentRuntime, message: Memory, state: State) => Promise<boolean>;
    handler: (
      runtime: IAgentRuntime,
      message: Memory,
      state: State,
      options: Record<string, unknown>,
      callback: HandlerCallback
    ) => Promise<ActionResult>;
  }

  export interface ActionExample {
    name: string;
    content: Content;
  }

  export interface ActionResult {
    success: boolean;
    text?: string;
    values?: Record<string, unknown>;
    data?: Record<string, unknown>;
    error?: string | Error;
  }

  export type HandlerCallback = (content: Content) => Promise<void>;

  // ============================================================================
  // Providers
  // ============================================================================

  export interface Provider {
    name: string;
    description?: string;
    get: (runtime: IAgentRuntime, message: Memory, state: State) => Promise<ProviderResult>;
  }

  export interface ProviderResult {
    text: string;
    values?: Record<string, unknown>;
    data?: Record<string, unknown>;
  }

  // ============================================================================
  // Evaluators
  // ============================================================================

  export interface Evaluator {
    name: string;
    description?: string;
    similes?: string[];
    examples?: EvaluatorExample[] | ActionExample[][];
    validate: (runtime: IAgentRuntime, message: Memory, state: State) => Promise<boolean>;
    handler: (
      runtime: IAgentRuntime,
      message: Memory,
      state: State,
      options?: Record<string, unknown>
    ) => Promise<EvaluatorResult | boolean>;
  }

  export interface EvaluatorExample {
    context: string;
    messages: Memory[];
    outcome: string;
  }

  export interface EvaluatorResult {
    passed: boolean;
    score?: number;
    reason?: string;
    data?: Record<string, unknown>;
  }

  // ============================================================================
  // Services
  // ============================================================================

  export abstract class Service {
    static serviceType: string;
    capabilityDescription?: string;

    constructor(runtime: IAgentRuntime);

    static start(runtime: IAgentRuntime): Promise<Service>;
    static stop?(runtime: IAgentRuntime): Promise<void>;
  }

  export type ServiceConstructor = typeof Service;

  // ============================================================================
  // Plugin
  // ============================================================================

  export interface Plugin {
    name: string;
    description?: string;
    priority?: number;
    config?: Record<string, unknown>;
    init?(config: Record<string, string>): Promise<void>;
    actions?: Action[];
    providers?: Provider[];
    evaluators?: Evaluator[];
    services?: ServiceConstructor[];
    routes?: Route[];
    models?: ModelRegistrationMap | ModelRegistration[];
    events?: Record<string, EventHandler[]>;
  }

  export type EventHandler = (params: Record<string, unknown>) => Promise<void>;

  export interface Route {
    name?: string;
    path: string;
    type?: string;
    method?: string;
    handler: RouteHandler;
  }

  export interface ModelRegistration {
    type: string;
    handler: ModelHandler;
  }

  export type ModelRegistrationMap = {
    [key in ModelType]?: ModelHandler;
  };

  // ============================================================================
  // Utilities
  // ============================================================================

  export interface Logger {
    info: ((message: string) => void) & ((data: Record<string, unknown>, message: string) => void);
    warn: ((message: string) => void) & ((data: Record<string, unknown>, message: string) => void);
    error: ((message: string) => void) & ((data: Record<string, unknown>, message: string) => void);
    debug: ((message: string) => void) & ((data: Record<string, unknown>, message: string) => void);
  }

  export const logger: Logger;

  export enum ModelType {
    TEXT_GENERATION = "TEXT_GENERATION",
    TEXT_EMBEDDING = "TEXT_EMBEDDING",
    IMAGE_GENERATION = "IMAGE_GENERATION",
    TEXT_SMALL = "TEXT_SMALL",
    TEXT_LARGE = "TEXT_LARGE",
  }
}
