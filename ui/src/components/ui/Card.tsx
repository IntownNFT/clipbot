import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-5 bg-surface-1 border border-border shadow-elevation-1",
        hover && "hover:shadow-elevation-2 hover:border-accent/25 transition-all duration-200 cursor-pointer",
        className
      )}
      {...props}
    />
  );
}
