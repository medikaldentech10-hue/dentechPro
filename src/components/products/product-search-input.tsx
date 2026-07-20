"use client";

import type { ChangeEvent } from "react";

import { Input } from "@/components/ui/input";

type ProductSearchInputProps = {
  className?: string;
  defaultValue?: string;
  placeholder: string;
};

export function ProductSearchInput({
  className,
  defaultValue,
  placeholder,
}: ProductSearchInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    event.currentTarget.form
      ?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "[data-catalog-refinement]"
      )
      .forEach((field) => {
        if (!field.dataset.catalogRefinementName) {
          field.dataset.catalogRefinementName = field.name;
        }

        field.removeAttribute("name");
        field.value = "";
        field.onchange = () => {
          field.name = field.dataset.catalogRefinementName ?? "";
        };
      });
  }

  return (
    <Input
      className={className}
      defaultValue={defaultValue}
      name="q"
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
}
