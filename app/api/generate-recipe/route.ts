import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { ingredients } = await request.json(); 
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // ZMIANA: Zmuszamy AI do zwrócenia formatu JSON z listą zakupów!
    const prompt = `Jesteś wesołym Szefem Kuchni w aplikacji Zero Waste. 
    Użytkownik ma w lodówce te składniki: ${ingredients.join(", ")}. 
    Wymyśl JEDEN prosty, pyszny i kreatywny przepis, który wykorzysta jak najwięcej z nich.
    Następnie wypisz WSZYSTKIE dodatkowe składniki, których brakuje do tego przepisu (nawet sól, pieprz, woda czy olej).
    
    Zwróć odpowiedź WYŁĄCZNIE jako obiekt JSON, dokładnie w tym formacie:
    {
      "recipeText": "Twój pełny przepis z krokami i emoji...",
      "missingIngredients": ["sól", "pieprz", "oliwa z oliwek"]
    }
    Nie używaj znaczników markdown (nie pisz \`\`\`json na początku). Zwróć sam czysty kod JSON.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      // Czyścimy odpowiedź AI z ewentualnych śmieci
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);
      
      return NextResponse.json({ 
        recipe: parsedData.recipeText,
        missing: parsedData.missingIngredients
      });
    } catch (parseError) {
      console.error("Błąd parsowania JSON od kucharza:", text);
      return NextResponse.json({ error: "Kucharz wymyślił przepis, ale nie potrafił zapisać go do bazy. Spróbuj jeszcze raz!" }, { status: 500 });
    }

  } catch (error) {
    console.error("Szczegóły błędu AI:", error);
    return NextResponse.json({ error: "Kucharz ma przerwę" }, { status: 500 });
  }
}