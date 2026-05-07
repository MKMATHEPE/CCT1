import { createContext, useContext } from "react";

export const ThemeContext = createContext<"dark" | "light">("dark");

export function useTheme() {
  return useContext(ThemeContext);
}
