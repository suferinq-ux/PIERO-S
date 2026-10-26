"use client";

import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { CategoryManager } from "./category-manager";
import { ProductManager } from "./product-manager";

type Tab = "categorias" | "productos";

export function CatalogoManager() {
  const [tab, setTab] = useState<Tab>("productos");

  const tabs: { id: Tab; label: string }[] = [
    { id: "productos", label: "Productos" },
    { id: "categorias", label: "Categorías" },
  ];

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border bg-muted p-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-background text-primary shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "productos" ? <ProductManager /> : <CategoryManager />}
    </div>
  );
}
