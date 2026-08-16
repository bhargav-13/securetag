import Link from "next/link";

/** Admin section switcher: the current vehicle system vs the legacy /found system. */
export default function AdminTabs({ active }: { active: "vehicle" | "legacy" }) {
  return (
    <div className="admin-tabs">
      <Link href="/dashboard" className={"admin-tab" + (active === "vehicle" ? " sel" : "")}>
        Vehicle tags
      </Link>
      <Link href="/dashboard/legacy" className={"admin-tab" + (active === "legacy" ? " sel" : "")}>
        Legacy tags
      </Link>
    </div>
  );
}
