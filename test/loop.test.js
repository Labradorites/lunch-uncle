import { test } from "node:test";
import assert from "node:assert/strict";
import { runLoop } from "../src/loop.js";

test("runLoop gives up after MAX_ROUNDS when the model keeps calling tools", async (t) => {
  let modelCalls = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (String(url).endsWith("/chat/completions")) {
      modelCalls++;
      // Abort instead of hanging the test if the loop never stops.
      if (modelCalls > 50) throw new Error("loop did not stop");
      const toolCall = {
        id: `call_${modelCalls}`,
        type: "function",
        function: { name: "get_rain_forecast", arguments: "{}" },
      };
      return Response.json({
        choices: [{ message: { role: "assistant", tool_calls: [toolCall] } }],
      });
    }
    return Response.json({});
  });
  t.mock.method(console, "log", () => {});

  const reply = await runLoop([], "will it rain?", { GOOGLE_PLACES_API_KEY: "k" });

  assert.equal(modelCalls, 8);
  assert.match(reply, /too many times/);
});
