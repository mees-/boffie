import Plausible from "plausible-tracker"

export const plausible = Plausible({
  domain: import.meta.env.VITE_PLAUSIBLE_DOMAIN,
  trackLocalhost: false,
})
