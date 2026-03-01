import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { image } = await request.json(); 
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = "Zidentyfikuj jedzenie na zdjęciu. Odpowiedz TYLKO formatem JSON: {\"name\": \"nazwa\", \"days\": liczba}";

    const mimeType = image.substring(image.indexOf(':') + 1, image.indexOf(';'));
    const base64Data = image.split(',')[1];

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: mimeType } }
    ]);

    let text = result.response.text();
    console.log("🤖 Co odpowiedziało Gemini:", text); // Dzięki temu zobaczymy to w czarnym terminalu!

    // Agresywne wycinanie tylko tego, co jest w klamerkach { }
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error("AI nie zwróciło klamerek JSON!");
    }

    // Odczytujemy czyste dane i wysyłamy do przeglądarki
    const cleanData = JSON.parse(match[0]);
    return NextResponse.json(cleanData);

  } catch (error: any) {
    console.error("🚨 SZCZEGÓŁY BŁĘDU:", error.message || error);
    return NextResponse.json({ error: "Błąd analizy" }, { status: 500 });
  }
}