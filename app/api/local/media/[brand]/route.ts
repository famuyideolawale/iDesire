import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseBrand, mutate } from "../../../../../lib/local/store";
import { requireUser, checkOrigin } from "../../../../../lib/local/auth";
import { failure } from "../../../../../lib/local/http";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ brand: string }> },
) {
  try {
    checkOrigin(request);
    const brand = parseBrand((await params).brand),
      user = await requireUser(brand);
    const form = await request.formData(),
      file = form.get("file");
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024)
      throw new Error("Choose an image no larger than 5 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP";
    const extension = png ? "png" : jpg ? "jpg" : webp ? "webp" : "";
    if (!extension) throw new Error("Use a PNG, JPEG or WebP image.");
    const name = `${brand}-${randomUUID()}.${extension}`;
    const folder = path.join(process.cwd(), ".local", "media");
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, name), bytes);
    const media = {
      id: randomUUID(),
      src: "/media/" + name,
      name: file.name,
      alt: String(form.get("alt") || file.name).slice(0, 300),
      createdAt: new Date().toISOString(),
    };
    await mutate(brand, user.name, "Uploaded media", media.id, (b) => {
      b.media.unshift(media);
      return media;
    });
    return NextResponse.json(media);
  } catch (e) {
    return failure(e);
  }
}
