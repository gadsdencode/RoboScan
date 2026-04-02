import type { User } from "@shared/schema";

export interface DashboardHeaderProps {
  user: User | undefined;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-3">
        Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
      </h1>
      <p className="text-muted-foreground">
        View and manage your website scans and optimization reports
      </p>
    </div>
  );
}
