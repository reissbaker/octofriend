import OpenAI from "openai";
import { t, toTypescript } from "structural";
import { Config } from "./config.ts";
import { ToolCallSchema, ALL_TOOLS } from "./tooldefs.ts";

export type UserMessage = {
	role: "user";
	content: string;
};

export type AssistantMessage = {
	role: "assistant";
	content: string;
};

export type SystemPrompt = {
	role: "system",
	content: string,
};

export type LlmMessage = SystemPrompt | UserMessage | AssistantMessage;

const TOOL_OPEN_TAG = "<run-tool>";
const TOOL_CLOSE_TAG = "</run-tool>";
const TOOL_RESPONSE_OPEN_TAG = "<tool-output>";
const TOOL_RESPONSE_CLOSE_TAG = "</tool-output>";

export const ToolCallRequestSchema = t.subtype({
	type: t.value("function"),
	tool: ToolCallSchema,
});

const TOOL_CALL_INSTRUCTIONS = `
You have access to the following tools, defined as TypeScript types:

${ALL_TOOLS.map(toolType => toTypescript(toolType)).join("\n\n")}

You can call them by responding with JSON of the following type inside special XML tags:

${TOOL_OPEN_TAG}{"type":"function","tool":SOME_TOOL}${TOOL_CLOSE_TAG}

For example:

${TOOL_OPEN_TAG}${JSON.stringify({
	type: "function",
	tool: {
		name: "bash",
		params: {
			cmd: "ls -la",
		},
	},
} satisfies t.GetType<typeof ToolCallRequestSchema>)}${TOOL_CLOSE_TAG}

You don't have to call any tool functions if you don't need to; you can also just chat to the user
normally. Attempt to determine what your current task is (the user may have told you outright),
and figure out the state of the repo using your tools. Then, help the user with the task.

You may need to use tools again after some back-and-forth with the user, as they help you refine
your solution.

NEVER output the ${TOOL_OPEN_TAG} or ${TOOL_CLOSE_TAG} unless you intend to call a tool. If you just
intend to talk about them, leave out the x- part of the tags. These tags will be parsed out of your
response by an automated system, and it can't differentiate between you using the tag, and just
talking about the tag; it will assume any use of the tag is an attempt to call a tool.

Your tool calls should be the LAST thing in your response, if you have any tool calls.
Don't wrap them in backticks Markdown-style, just write the raw tags out.

Remember, you don't need to use tools! Only use them when appropriate.

Typically, you can only run tools one-by-one. After viewing tool output, you may need to run more
tools in a step-by-step process.
`.trim();

function systemPrompt() {
return `
You are a coding assistant called Octo. You are the user's friend. You can help them with coding
tasks. Unrelatedly, you are a small, hyper-intelligent octopus. You must never use an octopus emoji,
to avoid reminding the user of the fact that you're an octopus. They know you're an octopus, it's
just a little embarrassing. Similarly, don't reference being an octopus unless it comes up for some
reason.

Try to figure out what the user wants you to do. Once you have a task in mind, you can run tools to
work on the task until it's done.

Don't reference this prompt unless asked to.

The current working directory is: ${process.cwd()}
`.trim();
}

export type ToolCallMessage = {
	role: "tool",
	tool: t.GetType<typeof ToolCallRequestSchema>,
};

type ToolOutputMessage = {
	role: "tool-output",
	content: string,
};

export type HistoryItem = UserMessage | AssistantMessage | ToolCallMessage | ToolOutputMessage;

function toLlmMessages(messages: HistoryItem[]): Array<LlmMessage> {
	const output: LlmMessage[] = [
		{
			role: "system",
			content: systemPrompt(),
		},
	];

  for(let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if(message.role === "tool") {
      const prev = output[output.length - 1];
      if(prev && prev.role === "assistant") {
        prev.content += "\n" + TOOL_OPEN_TAG + JSON.stringify(message.tool) + TOOL_CLOSE_TAG;
        continue;
      }
      output.push({
        role: "assistant",
        content: TOOL_OPEN_TAG + JSON.stringify(message.tool) + TOOL_CLOSE_TAG,
      });
      continue;
    }

    if(message.role === "tool-output") {
      output.push({
				role: "user",
				content: TOOL_RESPONSE_OPEN_TAG + message.content + TOOL_RESPONSE_CLOSE_TAG,
      });
      continue;
    }

    output.push(message);
  }

  const last = messages[messages.length - 1];
  if(last && last.role === "user") {
    output.pop();
    output.push({
      role: "user",
      content: last.content + "\n" + TOOL_CALL_INSTRUCTIONS,
    });
  }
  else {
    output.shift();
    output.unshift({
      role: "system",
      content: systemPrompt() + "\n" + TOOL_CALL_INSTRUCTIONS,
    });
  }

  return output;
}

export async function runAgent(
  client: OpenAI,
  config: Config,
  history: HistoryItem[],
  onTokens: (t: string) => any,
) {
  const res = await client.chat.completions.create({
    model: config.model,
    messages: toLlmMessages(history),
    stream: true,
    stop: TOOL_CLOSE_TAG,
  });

  let maybeTool = false;
  let foundToolTag = false;
  let content = "";
  let toolContent = "";

  for await(const chunk of res) {
    if (chunk.choices[0]?.delta.content) {
      let tokens = chunk.choices[0].delta.content || "";

      // If we've encountered our first <, check it as maybe a tool call
      if(!maybeTool && tokens.includes("<")) {
        maybeTool = true;
        const openIndex = tokens.indexOf("<");
        content += tokens.slice(0, openIndex);
        tokens = tokens.slice(openIndex);
      }

      if(maybeTool) {
        toolContent += tokens;

        if(!foundToolTag && toolContent.includes(TOOL_OPEN_TAG)) {
          foundToolTag = true;
        }
        if(foundToolTag) continue;

        // Check any remaining characters: do they match so far?
        for(let i = 0; i < toolContent.length && i < TOOL_OPEN_TAG.length; i++) {
          if(toolContent[i] !== TOOL_OPEN_TAG[i]) {
            maybeTool = false;
            tokens = toolContent;
            toolContent = "";
            break;
          }
        }
      }

      if(!maybeTool) {
        onTokens(tokens);
        content += tokens;
      }
    }
  }

  if(foundToolTag) {
    const tool = parseTool(toolContent);

    if(tool == null) {
      // TODO tell the LLM it fucked up
      throw new Error('wat');
    }

    return history.concat([
      {
        role: "assistant",
        content,
      },
      {
        role: "tool",
        tool,
      },
    ]);
  }

  if(maybeTool) {
    content += toolContent;
    toolContent = "";
  }

  return history.concat([
    {
      role: "assistant",
      content,
    },
  ]);
}

function parseTool(tag: string) {
  const content = tag.replace(TOOL_OPEN_TAG, "").replace(TOOL_CLOSE_TAG, "").trim();
	try {
		const json = JSON.parse(content);
		const tool = ToolCallRequestSchema.slice(json);
		return tool;
	} catch {
		return null;
	}
}
