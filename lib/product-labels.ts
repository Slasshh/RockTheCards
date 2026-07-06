export function formatProductBadge(badge: string) {
  return badge.trim().toUpperCase() === "RAR MAIL" ? "PAR MAIL" : badge;
}
