import React from "react";

export const THEME_COLOR = "#72946d";
export const UNCHAINED_COLOR = "#AA0A0A";

export function color(unchained: boolean) {
  if(unchained) return UNCHAINED_COLOR;
  return THEME_COLOR;
}

export const UnchainedContext = React.createContext<boolean>(false);

export function useUnchained() {
  return React.useContext(UnchainedContext);
}

export function useColor() {
  const unchained = useUnchained();
  return color(unchained);
}