import { init } from "@/lib/bootstrap";
import { listCategories } from "@/lib/repositories/categories";
import { StoryEditor } from "@/components/admin/StoryEditor";

export const dynamic = "force-dynamic";

export default async function NewStoryPage() {
  init();
  const categories = await listCategories();
  return <StoryEditor story={null} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />;
}
