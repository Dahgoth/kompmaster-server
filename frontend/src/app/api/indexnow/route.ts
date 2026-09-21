import { config } from "@/config";

/** IndexNow key file (https://www.indexnow.org/documentation). */
export function GET() {
  if (!config.indexNowKey) {
    return new Response("Not configured", { status: 404 });
  }
  return new Response(config.indexNowKey, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
