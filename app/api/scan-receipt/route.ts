import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    
    // Używamy modelu vision (gemini-1.5-flash) do czytania zdjęć
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Przygotowanie obrazu
    const base64Data = image.split(',')[1];
    const imageParts = [{
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg"
      }
    }];

    // Bardzo precyzyjna instrukcja dla AI
    const prompt = `Przeanalizuj ten paragon sklepowy. Znajdź na nim TYLKO produkty spożywcze (zignoruj chemię, torby itp.).
    Rozszyfruj skróty sklepowe na ładne nazwy (np. "POM. LUZ" -> "Pomidor", "MLEKO UHT 3.2" -> "Mleko 3.2%").
    Dla każdego produktu oszacuj, ile dni będzie świeży w lodówce.
    
    Zwróć odpowiedź WYŁĄCZNIE jako tablicę obiektów JSON w tym formacie:
    [
      {"name": "Pomidor", "days": 7},
      {"name": "Mleko 3.2%", "days": 14}
    ]
    Nie dodawaj żadnego innego tekstu, markdownu ani znaczników \`\`\`json. Sam czysty JSON.`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    // Parsujemy odpowiedź z tekstu na prawdziwy obiekt JSON
    try {
      // Czasem AI dodaje znaki nowej linii, czyścimy to
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const products = JSON.parse(cleanJson);
      return NextResponse.json({ products });
    } catch (parseError) {
      console.error("Błąd parsowania JSON z AI:", text);
      return NextResponse.json({ error: "Nie udało się rozpoznać produktów. Zrób wyraźniejsze zdjęcie." }, { status: 400 });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}