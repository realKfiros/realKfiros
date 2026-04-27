import fs from "node:fs";
import OpenAI from "openai";

const START = "<!-- LIVERPOOL_MODE:start -->";
const END = "<!-- LIVERPOOL_MODE:end -->";

const fallbackText = [
	"**Mood:** cautiously optimistic",
	"**YNWA intensity:** 90%",
	"**AI thought:** Bugs may be scary, but a Liverpool counter-press is scarier.",
].join("\n");

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

function cleanOutput(text: string): string {
	return text
		.replace(/\[([^\]]+)\]\((.*?)\)/g, "$1")
		.replace(/https?:\/\/\S+/g, "")
		.replace(/www\.\S+/g, "")
		.replace(/\b\S+\.(com|net|org|io|dev|app|co|uk)\S*/gi, "")
		.replace(/【[^】]+】/g, "")
		.replace(/\s+\n/g, "\n")
		.trim();
}

function hasLinks(text: string): boolean {
	return /https?:\/\/|www\.|\[[^\]]+\]\((.*?)\)|\b\S+\.(com|net|org|io|dev|app|co|uk)\S*/i.test(text);
}

async function generateLiverpoolMode(): Promise<string> {
	try {
		const response = await client.responses.create({
			model: "gpt-5.2",
			temperature: 1.1,
			tools: [
				{
					type: "web_search",
				},
			],
			instructions: `
You are NOT a journalist.

You are a passionate Liverpool fan tweeting reactions.

You may use recent news, rumors, injuries, transfers, or results ONLY as context,
but you MUST react emotionally like a fan.

Style rules:
- Emotional
- Slightly chaotic
- Confident but stressed
- Sometimes dramatic or overreacting
- Sounds like Twitter, not an article
- Short sentences are OK
- A bit unhinged is good
- The take should be 280 characters long max

Hard rules:
- No links
- No URLs
- No citations
- No sources
- No formal language
- No explanations

Format EXACTLY:

**Mood:** ...<br />
**YNWA intensity:** ...%<br />
**Take:** ...
`.trim(),

			input: `
What are Liverpool fans reacting to right now?

Find one concrete recent Liverpool FC topic:
- a match/result
- transfer rumor
- injury
- manager/player quote
- title race / table situation
- fan discourse

React to that one thing like a Liverpool fan in a group chat.

React to it like a fan on Twitter/X.

DO NOT explain the news.
DO NOT summarize.
ONLY react emotionally.
`.trim(),
		});

		const cleaned = cleanOutput(response.output_text);

		if (!cleaned || hasLinks(cleaned)) {
			return fallbackText;
		}

		return cleaned;
	} catch (error) {
		console.error(error);
		return fallbackText;
	}
}

function updateReadme(content: string, replacement: string): string {
	const regex = new RegExp(`${START}[\\s\\S]*${END}`);

	if (!regex.test(content)) {
		throw new Error("Liverpool mode markers were not found in README.md");
	}

	return content.replace(regex, `${START}\n${replacement}\n${END}`);
}

async function main(): Promise<void> {
	const text = await generateLiverpoolMode();
	const readme = fs.readFileSync("README.md", "utf8");
	const updated = updateReadme(readme, text);

	fs.writeFileSync("README.md", updated);
}

await main();
