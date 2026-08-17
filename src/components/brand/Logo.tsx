import { RoamPulseLogo } from "./RoamPulseLogo";

export function Logo({
  className,
  inverted = false,
  size = "md",
}: {
  className?: string;
  inverted?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | number;
}) {
  return <RoamPulseLogo className={className} inverted={inverted} size={size} />;
}
