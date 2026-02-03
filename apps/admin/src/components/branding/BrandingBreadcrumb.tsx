"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { HomeIcon } from "lucide-react";
import { Fragment } from "react";
import type { BrandingBreadcrumbProps } from "./types";

export function BrandingBreadcrumb({ path, onNavigate }: BrandingBreadcrumbProps) {
  const parts = path ? path.split("/") : [];

  const handleClick = (index: number) => {
    const newPath = parts.slice(0, index + 1).join("/");
    onNavigate(newPath);
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            onClick={() => onNavigate("")}
            className="cursor-pointer flex items-center gap-1"
          >
            <HomeIcon className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {parts.map((part, index) => (
          <Fragment key={index}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === parts.length - 1 ? (
                <BreadcrumbPage>{part}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink onClick={() => handleClick(index)} className="cursor-pointer">
                  {part}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
