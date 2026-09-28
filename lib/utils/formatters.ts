export function formatCurrency(amount: number, currency: string = "INR"): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "AED ",
  };

  const symbol = symbols[currency] || `${currency} `;
  const formattedNumber = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  return `${amount < 0 ? "-" : ""}${symbol}${formattedNumber}`;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = nowDate.getTime() - dDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays === -1) return "Tomorrow";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;

  return formatDate(d);
}
