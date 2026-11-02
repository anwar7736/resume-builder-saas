import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";

const maximumExtractedCharacters = 30_000;

export async function extractProfileSummaryText(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;

  if (extension === ".txt") {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } else if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (extension === ".doc") {
    const document = await new WordExtractor().extract(buffer);
    text = [
      document.getBody(),
      document.getHeaders(),
      document.getFootnotes(),
      document.getEndnotes(),
      document.getTextboxes({ includeHeadersAndFooters: false, includeBody: false }),
    ].filter(Boolean).join("\n");
  } else if (extension === ".pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else {
    throw new Error("Unsupported profile summary file type.");
  }

  const normalizedText = text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  if (!normalizedText) {
    throw new Error("The profile summary file contains no extractable text.");
  }

  if (normalizedText.length <= maximumExtractedCharacters) return normalizedText;

  return `${normalizedText.slice(0, maximumExtractedCharacters)}\n\n[Profile summary text truncated after ${maximumExtractedCharacters} characters.]`;
}
