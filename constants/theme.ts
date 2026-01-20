export const theme = {
  colors: {
    // Primary palette (calm, professional)
    primary: "#2563EB", // Blue 600
    primaryDark: "#1D4ED8", // Blue 700
    primaryLight: "#DBEAFE", // Blue 100

    // Neutrals
    background: "#FFFFFF",
    surface: "#F9FAFB", // Gray 50
    border: "#E5E7EB", // Gray 200
    textPrimary: "#111827", // Gray 900
    textSecondary: "#6B7280", // Gray 500
    textMuted: "#9CA3AF", // Gray 400

    // Semantic
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",

    // Specialty badges
    productivity: "#3B82F6", // Blue
    goals: "#8B5CF6", // Purple
    habits: "#10B981", // Green
    mindset: "#F59E0B", // Amber
    focus: "#6366F1", // Indigo
    custom: "#EC4899", // Pink
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
  },
};

export type Specialty =
  | "productivity"
  | "goals"
  | "habits"
  | "mindset"
  | "focus"
  | "custom";
