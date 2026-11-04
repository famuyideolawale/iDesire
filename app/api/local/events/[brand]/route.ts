import { database, parseBrand } from "../../../../../lib/local/store";
import { requireUser } from "../../../../../lib/local/auth";
import { failure } from "../../../../../lib/local/http";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ brand: string }> },
) {
  try {
    const brand = parseBrand((await params).brand);
    if (new URL(request.url).searchParams.get("scope") === "admin")
      await requireUser(brand);
    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    let previous = -1;
    let stop = () => {};
    const stream = new ReadableStream({
      start(controller) {
        stop = () => {
          if (stopped) return;
          stopped = true;
          if (timer) clearInterval(timer);
          request.signal.removeEventListener("abort", stop);
          try {
            controller.close();
          } catch {}
        };
        const tick = async () => {
          if (stopped) return;
          try {
            const rev = (await database()).businesses[brand].revision;
            if (rev !== previous) {
              previous = rev;
              controller.enqueue(
                encoder.encode(`event: change
data: ${JSON.stringify({ revision: rev })}

`),
              );
            } else controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            stop();
          }
        };
        request.signal.addEventListener("abort", stop, { once: true });
        if (request.signal.aborted) {
          stop();
          return;
        }
        void tick();
        timer = setInterval(() => void tick(), 1200);
      },
      cancel() {
        stop();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
