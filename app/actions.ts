"use server";

export async function searchGlobalFoodDatabase(query: string) {
  try {
    const safeQuery = encodeURIComponent(query.trim());
    
    // MEGA OPTYMALIZACJA: Dodaliśmy parametr "&fields=..."
    // Pobieramy TYLKO 4 rzeczy (nazwę, markę, ID i małe zdjęcie). 
    // Dzięki temu zapytanie jest lżejsze o 99% i działa jak błyskawica!
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${safeQuery}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,brands,image_front_small_url,image_small_url,id`;
    
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    
    return await response.json();
  } catch (error) {
    console.error("Błąd pobierania bazy:", error);
    return null;
  }
}

export async function searchProductByBarcode(barcode: string) {
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      return {
        name: data.product.product_name || "Nieznany produkt",
        brand: data.product.brands || ""
      };
    }
    return null;
  } catch (error) {
    console.error("Błąd skanowania kodu:", error);
    return null;
  }
}