const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function askGemini(systemPrompt, userMessage) {
  const res = await fetch(
    `${GEMINI_URL}?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt + "\n\nUser request: " + userMessage }],
          },
        ],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    }
  );
  if (!res.ok) throw new Error("Gemini API error: " + res.status);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";
}
