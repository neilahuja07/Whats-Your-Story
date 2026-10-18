import { init } from "@/lib/bootstrap";
import PortraitsPanel from "@/components/admin/PortraitsPanel";

export const dynamic = "force-dynamic";

export default function AdminPortraitsPage() {
  init();
  return <PortraitsPanel />;
}
