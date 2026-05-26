// AI chat handler — Express route using @yourgpt/llm-sdk

const { streamText } = require("@yourgpt/llm-sdk");
const { MODEL, SYSTEM_PROMPT, MAX_STEPS, MAX_TOKENS } = require("./config");
const { createTools } = require("./tools");

async function handleChat(req, res) {
  const { messages, orgId } = req.body;
  const tools = createTools(orgId, req.user.id);

  const result = await streamText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    messages,
    tools,
    maxSteps: MAX_STEPS,
    maxTokens: MAX_TOKENS,
  });

  const response = result.toDataStreamResponse();
  res.writeHead(200, Object.fromEntries(response.headers));

  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

module.exports = { handleChat };
