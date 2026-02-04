"use client";

/**
 * JSON-Render Component Catalog
 *
 * Defines all available components for AI-generated UI in the admin app.
 * Self-contained implementation without external dependencies.
 */

import { StatCard, StatGrid } from "@/components/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface ComponentDefinition {
  component: ComponentType<Record<string, unknown>>;
  children?: boolean;
}

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================

const GridComponent = ({
  columns = 2,
  gap = "md",
  children,
}: {
  columns?: number;
  gap?: "sm" | "md" | "lg";
  children: ReactNode;
}) => {
  const gapClass = { sm: "gap-2", md: "gap-4", lg: "gap-6" }[gap];
  return (
    <div
      className={`grid ${gapClass}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
};

const StackComponent = ({
  direction = "vertical",
  gap = "md",
  align = "stretch",
  children,
}: {
  direction?: "vertical" | "horizontal";
  gap?: "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end" | "stretch";
  children: ReactNode;
}) => {
  const gapClass = { sm: "gap-2", md: "gap-4", lg: "gap-6", xl: "gap-8" }[gap];
  const alignClass = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  }[align];
  const dirClass = direction === "horizontal" ? "flex-row" : "flex-col";
  return <div className={`flex ${dirClass} ${gapClass} ${alignClass}`}>{children}</div>;
};

const SectionComponent = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <section className="space-y-4">
    <div className="space-y-1">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    <div>{children}</div>
  </section>
);

const CardComponent = ({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) => (
  <Card>
    {(title || description) && (
      <CardHeader>
        {title && <CardTitle>{title}</CardTitle>}
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
    )}
    <CardContent className={title || description ? "" : "pt-6"}>{children}</CardContent>
  </Card>
);

// =============================================================================
// DATA DISPLAY COMPONENTS
// =============================================================================

const MetricCardComponent = ({
  title,
  value,
  change,
  changeType,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  description?: string;
  icon?: string;
}) => {
  const TrendIcon =
    changeType === "increase" ? TrendingUp : changeType === "decrease" ? TrendingDown : null;
  const changeColor =
    changeType === "increase"
      ? "text-green-500"
      : changeType === "decrease"
        ? "text-red-500"
        : "text-muted-foreground";

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${changeColor}`}>
              {TrendIcon && <TrendIcon className="h-4 w-4" />}
              <span>
                {change > 0 ? "+" : ""}
                {change}%
              </span>
            </div>
          )}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
    </Card>
  );
};

const ProgressCardComponent = ({
  title,
  current,
  total,
  description,
}: {
  title: string;
  current: number;
  total: number;
  description?: string;
}) => {
  const percentage = Math.round((current / total) * 100);
  return (
    <Card className="p-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <span className="text-sm font-medium">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {current.toLocaleString()} / {total.toLocaleString()}
          </span>
          {description && <span>{description}</span>}
        </div>
      </div>
    </Card>
  );
};

const AlertBannerComponent = ({
  type = "info",
  title,
  message,
}: {
  type?: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
}) => {
  const config = {
    info: {
      icon: Info,
      bg: "bg-blue-500/10 border-blue-500/20",
      text: "text-blue-500",
    },
    success: {
      icon: CheckCircle,
      bg: "bg-green-500/10 border-green-500/20",
      text: "text-green-500",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-amber-500/10 border-amber-500/20",
      text: "text-amber-500",
    },
    error: {
      icon: AlertCircle,
      bg: "bg-red-500/10 border-red-500/20",
      text: "text-red-500",
    },
  }[type];

  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${config.bg}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 ${config.text}`} />
      <div className="space-y-1">
        <p className={`font-medium ${config.text}`}>{title}</p>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
};

const DataListComponent = ({
  items,
}: {
  items: Array<{ label: string; value: string | number; badge?: string }>;
}) => (
  <div className="divide-y rounded-lg border">
    {items.map((item) => (
      <div key={item.label} className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-muted-foreground">{item.label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.value}</span>
          {item.badge && (
            <Badge variant="secondary" className="text-xs">
              {item.badge}
            </Badge>
          )}
        </div>
      </div>
    ))}
  </div>
);

const TableComponent = ({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
}) => (
  <div className="rounded-lg border overflow-hidden">
    <table className="w-full">
      <thead className="bg-muted/50">
        <tr>
          {headers.map((header) => (
            <th
              key={header}
              className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((row) => {
          const rowKey = row.join("-");
          return (
            <tr key={rowKey} className="hover:bg-muted/30 transition-colors">
              {row.map((cell) => (
                <td key={`${rowKey}-${cell}`} className="px-4 py-3 text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const TextComponent = ({
  content,
  variant = "body",
  className,
}: {
  content: string;
  variant?: "h1" | "h2" | "h3" | "body" | "small" | "muted";
  className?: string;
}) => {
  const styles = {
    h1: "text-3xl font-bold tracking-tight",
    h2: "text-2xl font-semibold tracking-tight",
    h3: "text-xl font-medium",
    body: "text-base",
    small: "text-sm",
    muted: "text-sm text-muted-foreground",
  };
  return <p className={`${styles[variant]} ${className ?? ""}`}>{content}</p>;
};

const BadgeComponent = ({
  text,
  variant = "default",
}: {
  text: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}) => <Badge variant={variant}>{text}</Badge>;

const ButtonComponent = ({
  label,
  variant = "default",
  size = "default",
}: {
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}) => (
  <Button variant={variant} size={size}>
    {label}
  </Button>
);

// =============================================================================
// FORM COMPONENTS
// =============================================================================

const FormFieldComponent = ({
  label,
  placeholder,
  type = "text",
  required,
  description,
}: {
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "textarea";
  required?: boolean;
  description?: string;
}) => (
  <div className="space-y-2">
    <Label>
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
    {type === "textarea" ? (
      <textarea
        placeholder={placeholder}
        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    ) : (
      <Input type={type} placeholder={placeholder} />
    )}
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
  </div>
);

const SelectFieldComponent = ({
  label,
  options,
  placeholder,
  required,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
}) => (
  <div className="space-y-2">
    <Label>
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
    <Select>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

// =============================================================================
// TABS COMPONENTS
// =============================================================================

const TabsComponent = ({
  tabs,
  defaultValue,
  children,
}: {
  tabs: Array<{ value: string; label: string }>;
  defaultValue?: string;
  children: ReactNode;
}) => (
  <Tabs defaultValue={defaultValue ?? tabs[0]?.value}>
    <TabsList>
      {tabs.map((tab) => (
        <TabsTrigger key={tab.value} value={tab.value}>
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
    {children}
  </Tabs>
);

const TabContentComponent = ({ value, children }: { value: string; children: ReactNode }) => (
  <TabsContent value={value} className="mt-4">
    {children}
  </TabsContent>
);

// =============================================================================
// CATALOG DEFINITION
// =============================================================================

export const adminCatalog: Record<string, ComponentDefinition> = {
  // Layout Components
  Grid: {
    component: GridComponent as ComponentType<Record<string, unknown>>,
    children: true,
  },
  Stack: {
    component: StackComponent as ComponentType<Record<string, unknown>>,
    children: true,
  },
  Section: {
    component: SectionComponent as ComponentType<Record<string, unknown>>,
    children: true,
  },
  Card: {
    component: CardComponent as ComponentType<Record<string, unknown>>,
    children: true,
  },
  Separator: {
    component: Separator as ComponentType<Record<string, unknown>>,
  },

  // Data Display
  MetricCard: {
    component: MetricCardComponent as ComponentType<Record<string, unknown>>,
  },
  ProgressCard: {
    component: ProgressCardComponent as ComponentType<Record<string, unknown>>,
  },
  AlertBanner: {
    component: AlertBannerComponent as ComponentType<Record<string, unknown>>,
  },
  DataList: {
    component: DataListComponent as ComponentType<Record<string, unknown>>,
  },
  Table: {
    component: TableComponent as ComponentType<Record<string, unknown>>,
  },
  StatCard: {
    component: StatCard as ComponentType<Record<string, unknown>>,
  },
  StatGrid: {
    component: StatGrid as ComponentType<Record<string, unknown>>,
    children: true,
  },

  // Text & UI Elements
  Text: {
    component: TextComponent as ComponentType<Record<string, unknown>>,
  },
  Badge: {
    component: BadgeComponent as ComponentType<Record<string, unknown>>,
  },
  Button: {
    component: ButtonComponent as ComponentType<Record<string, unknown>>,
  },

  // Form Components
  FormField: {
    component: FormFieldComponent as ComponentType<Record<string, unknown>>,
  },
  SelectField: {
    component: SelectFieldComponent as ComponentType<Record<string, unknown>>,
  },

  // Tabs
  Tabs: {
    component: TabsComponent as ComponentType<Record<string, unknown>>,
    children: true,
  },
  TabContent: {
    component: TabContentComponent as ComponentType<Record<string, unknown>>,
    children: true,
  },
};

export type AdminCatalog = typeof adminCatalog;
