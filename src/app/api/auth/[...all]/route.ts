import { getAuth } from "@/server/auth";
import { configured } from "@/server/projects/service";
async function handler(request: Request) {
  if (!configured())
    return Response.json(
      { message: "Authentication is not configured." },
      { status: 503 },
    );
  return getAuth().handler(request);
}
export const GET = handler;
export const POST = handler;
