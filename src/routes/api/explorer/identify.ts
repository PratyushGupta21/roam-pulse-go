import { identifyPlace } from "@/lib/explorer.functions";

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    const body = await request.json();
    const result = await identifyPlace({ data: body });
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to identify place";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
