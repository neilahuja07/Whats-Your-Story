# Image credits & provenance

## Current policy: no stock or generated portraits

This site **does not ship with any stock photographs of people**, and it never
generates or scrapes images of individuals. Every portrait of a real person must
be imported manually and verified before it appears publicly.

Until a photograph is imported **and** verified, the site renders a neutral
placeholder (the person's initials on a plain background) — never another
person's photo and never an AI-generated substitute.

Imported portraits are stored in the public Supabase Storage bucket
`story-images` under descriptive, person-based object names (e.g.
`stories/<storyId>/amara-okafor.jpg`, `founder/...` for the founder
photograph). Their provenance is recorded in the database
(`portrait_imports` table), including the source note, whether the person
match was confirmed, and whether publication permission was granted.

See the project `README.md` ("Importing real photographs") for the manual
import workflow, and `npm run import-portrait --help` for the command-line tool.

## Bundled image

| File | Description | Source | License |
| --- | --- | --- | --- |
| `editorial/about-01.jpg` | Close-up of a fountain pen on paper (no identifiable people) | [Unsplash](https://unsplash.com) — photo-1455390582262-044cdead277a | [Unsplash License](https://unsplash.com/license) |

## Removed placeholder images

Earlier revisions of this repository contained Unsplash stock portraits and
hero images used purely to demonstrate the layout. **All of those files have
been deleted**, including every file under `portraits/` and the former
`hero-01.jpg`, `hero-02.jpg`, and `founder-placeholder.jpg`. They must not be
restored, because stock photos of real people imply identities and stories that
are not real.

## Adding new images

If you add any image to this repository, record it here with:

- the exact file path,
- a short description,
- the source (person or site), and
- the license or proof of permission.

Photographs of identifiable people additionally require recorded confirmation of
both identity and publication permission before they are shown on the site.
