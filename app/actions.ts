"use server";

export async function searchGlobalFoodDatabase(foodName: string) {
  try {
    // Nasz własny serwer uderza prosto do globalnej encyklopedii, omijając blokady przeglądarki!
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        foodName
      )}&search_simple=1&action=process&json=1&page_size=15`,
      { cache: 'no-store' }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Błąd połączenia z bazą:", error);
    return null;
  }
}