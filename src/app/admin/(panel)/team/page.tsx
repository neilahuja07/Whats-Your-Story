import { init } from "@/lib/bootstrap";
import { TeamManager } from "@/components/admin/TeamManager";

export const dynamic = "force-dynamic";

export default function AdminTeamPage() {
  init();
  return <TeamManager />;
}
