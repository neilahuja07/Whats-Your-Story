import { init } from "@/lib/bootstrap";
import { FounderEditor } from "@/components/admin/FounderEditor";

export const dynamic = "force-dynamic";

export default function AdminFounderPage() {
  init();
  return <FounderEditor />;
}
