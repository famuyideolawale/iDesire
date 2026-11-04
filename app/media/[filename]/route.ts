import { loadMedia } from "../../../lib/local/media";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!/^(idesire|kokies)-[a-f0-9-]+\.(png|jpg|webp)$/.test(filename))
    return new Response("Not found", { status: 404 });
  try {
    const bytes = await loadMedia(filename);
    const ext = filename.split(".").pop();
    return new Response(new Uint8Array(bytes), {
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
