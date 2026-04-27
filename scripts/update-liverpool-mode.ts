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
			model: "gpt-5.5",
			tools: [
				{type: 'web_search'},
			],
			instructions: `
You write short, funny GitHub profile README snippets.

Rules:
- No links.
- No URLs.
- No markdown links.
- No citations.
- No sources.
- No hashtags.
- No more than 35 words.
- Output exactly 3 lines.
- Use this exact format:

**Mood:** ... \
**YNWA intensity:** ...% \
**AI thought:** ...
      `.trim(),
			input: `
How would you feel today if you were a Liverpool fan?

Style:
- witty
- slightly sarcastic
- developer humor
- optimistic but emotionally unstable
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
