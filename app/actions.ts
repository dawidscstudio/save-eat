"use server";

// STARA FUNKCJA: Do ręcznego wpisywania tekstu
export async function searchGlobalFoodDatabase(query: string) {
  try {
    const safeQuery = encodeURIComponent(query.trim());
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${safeQuery}&search_simple=1&action=process&json=1&page_size=15`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Błąd pobierania bazy:", error);
    return null;
  }
}

// NOWA FUNKCJA: Do błyskawicznego szukania po kodzie kreskowym
export async function searchProductByBarcode(barcode: string) {
  try {
    // OpenFoodFacts ma specjalny adres tylko do czytania konkretnych kodów
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // Jeśli status = 1, to znaczy że znaleźli produkt w bazie
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