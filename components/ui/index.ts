/**
 * The design system's public surface.
 *
 * Screens import from here, not from the individual files, so a component can
 * be split or renamed without touching every call site.
 */
export { Button, buttonVariants, type ButtonProps } from "./button";
export { Input, type InputProps } from "./input";
export { Badge, type BadgeProps } from "./badge";
export { Card, CardTitle, CardEyebrow } from "./card";
export { ConfidenceMeter, type ConfidenceMeterProps } from "./confidence-meter";
export {
  StageIndicator,
  StageList,
  type StageIndicatorProps,
  type StageState,
} from "./stage-indicator";
export { EvidenceBlock, type EvidenceBlockProps } from "./evidence-block";
export { Disclaimer } from "./disclaimer";
export { StatePanel, type StatePanelProps } from "./state-panel";
export { Owl } from "./owl";
export { ThemeToggle, useTheme } from "./theme-toggle";
