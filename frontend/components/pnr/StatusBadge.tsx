"use client";

export function StatusBadge({ status }: { status: string }) {
  const upper = (status || "").toUpperCase();
  const isConfirmed =
    upper.includes("CNF") || upper.includes("CONFIRMED") || upper.startsWith("CNF");
  const isRac = upper.includes("RAC");
  const isWaiting = upper.includes("WL") || upper.includes("WAITING");
  const isCancelled =
    upper.includes("CAN") || upper.includes("CANCELLED") || upper.includes("RFL");

  let badgeClass = "badge";
  let label = status || "Unknown";

  if (isConfirmed) {
    badgeClass += " badge-success";
    label = "Confirmed";
  } else if (isRac) {
    badgeClass += " badge-warning";
    label = "RAC";
  } else if (isWaiting) {
    badgeClass += " badge-warning";
    label = "Waiting List";
  } else if (isCancelled) {
    badgeClass += " badge-error";
    label = "Cancelled";
  } else {
    badgeClass += " badge-blue";
  }

  return <span className={badgeClass}>{label}</span>;
}
