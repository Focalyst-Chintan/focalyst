// Set while screen 28 (or the report page) has opened the paywall on purpose, so the app-level
// onboarding rule doesn't send the user back to the report from it.
let reportPaywallOpen = false;

export function setReportPaywallOpen(open: boolean) {
  reportPaywallOpen = open;
}

export function isReportPaywallOpen(): boolean {
  return reportPaywallOpen;
}
