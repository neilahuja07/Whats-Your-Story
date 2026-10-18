import { init } from "@/lib/bootstrap";
import { ContentEditor } from "@/components/admin/ContentEditor";

export const dynamic = "force-dynamic";

export default function AdminContentPage() {
  init();
  return <ContentEditor />;
}
