import { readFile } from "node:fs/promises";
import path from "node:path";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!/^(idesire|kokies)-[a-f0-9-]+\.(png|jpg|webp)$/.test(filename))
    return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(
      path.join(process.cwd(), ".local", "media", filename),
    );
    const ext = filename.split(".").pop();
    return new Response(bytes, {
      headers: {
        "Content-Type": ext === "jpg" ? "image/jpeg" : `image/${ext}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public,max-age=31536000,immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
