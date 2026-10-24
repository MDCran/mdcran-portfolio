"use client";

import FilterSelect from "@/components/shared/FilterSelect";
import { normalizeRole, portfolioRoles, roleLabels, type PortfolioRole } from "@/lib/public-portfolio";

export default function EngineeringRoleFilter({ value, onChange }: {
  value: PortfolioRole;
  onChange: (value: PortfolioRole) => void;
}) {
  return (
    <FilterSelect value={value} onChange={(next) => onChange(normalizeRole(next))}
      label="Role view" options={portfolioRoles.map((role) => ({ value: role, label: roleLabels[role] }))} />
  );
}
