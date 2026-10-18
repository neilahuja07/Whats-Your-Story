import { init } from "@/lib/bootstrap";
import { getStoryById } from "@/lib/repositories/stories";
import { listCategories } from "@/lib/repositories/categories";
import { StoryEditor } from "@/components/admin/StoryEditor";

export const dynamic = "force-dynamic";

export default async function EditStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  init();
  const { id } = await params;
  const story = await getStoryById(id);
  const categories = listCategories();

  if (!story) {
    return (
      <div className="border border-line bg-paper p-10 text-center">
        <h1 className="font-serif text-h3 text-charcoal">Story not found</h1>
        <p className="mt-2 text-[0.9rem] text-muted">
          It may have been deleted. Return to the stories list to continue.
        </p>
      </div>
    );
  }

  return (
    <StoryEditor
      story={story}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
