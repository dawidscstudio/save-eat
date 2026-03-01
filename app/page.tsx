"use client";

import { useState, useEffect, useRef } from "react";
import { searchProductByBarcode } from "./actions"; // Usunęliśmy stare, wolne wyszukiwanie z actions.ts!
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { useZxing } from "react-zxing"; 

interface FoodItem {
  id: string;
  name: string;
  expiryDate: string;
  addedAt: number;
}

interface ShoppingItem {
  id: string;
  name: string;
}

const REWARDS_CATALOG = [
  { id: 'r1', title: 'E-book: "Gotuj z resztek"', description: 'Najlepsze przepisy Zero Waste. E-book wyślemy prosto na Twojego maila!', cost: 20, icon: '📖' }
];

function BarcodeScannerModal({ onResult, onClose }: { onResult: (text: string) => void, onClose: () => void }) {
  const { ref } = useZxing({
    onDecodeResult(result) {
      onResult(result.getText());
    },
  });

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm relative flex flex-col items-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl font-bold bg-gray-100 hover:bg-red-50 w-8 h-8 rounded-full flex items-center justify-center transition-colors">✕</button>
        <h2 className="text-2xl font-bold text-gray-800 mb-2 mt-2">Skaner Kodów 📷</h2>
        <p className="text-sm text-gray-500 mb-6 text-center">Nakieruj aparat na kod kreskowy.</p>
        
        <div className="relative w-full overflow-hidden rounded-2xl bg-black border-4 border-gray-100 shadow-inner">
          <video ref={ref} className="w-full h-64 object-cover" />
          <div className="absolute inset-0 border-4 border-green-500/50 m-6 rounded-xl pointer-events-none animate-pulse"></div>
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.8)] pointer-events-none"></div>
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center">Zaakceptuj uprawnienia kamery w przeglądarce, jeśli o to zapyta.</p>
      </div>
    </div>
  );
}

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiryDate, setPremiumExpiryDate] = useState<string | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  
  const [isScanning, setIsScanning] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [totalSavings, setTotalSavings] = useState(0);
  const [isChefOpen, setIsChefOpen] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState("");
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);

  const [items, setItems] = useState<FoodItem[]>([]);
  
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [newShoppingItem, setNewShoppingItem] = useState(""); 
  
  const [shoppingSuggestions, setShoppingSuggestions] = useState<any[]>([]);
  const [showShoppingSuggestions, setShowShoppingSuggestions] = useState(false);
  const [shoppingSearchMessage, setShoppingSearchMessage] = useState("");
  
  const [foodName, setFoodName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  
  const [savedItemsCount, setSavedItemsCount] = useState(0);
  const [pointsToday, setPointsToday] = useState(0);
  const [lastPointDate, setLastPointDate] = useState("");

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");

  const activatePremium = (days: number) => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    setIsPremium(true);
    setPremiumExpiryDate(expiry.toLocaleDateString());
    localStorage.setItem("saveEat_isPremium", "true");
    localStorage.setItem("saveEat_premiumExpiry", expiry.toISOString());
  };

  useEffect(() => {
    if (isSignedIn && user) {
      const hasReceivedWelcome = localStorage.getItem(`welcome_premium_${user.id}`);
      if (!hasReceivedWelcome) {
        activatePremium(7);
        localStorage.setItem(`welcome_premium_${user.id}`, "true");
        alert("🎉 Witaj w SaveEat!\nW nagrodę za rejestrację otrzymujesz 7 DNI PREMIUM za darmo.");
      }
    }
  }, [isSignedIn, user]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("success")) {
      alert("Płatność potwierdzona przez bank! Witamy w Premium 👑");
      activatePremium(30);
      window.history.pushState({}, document.title, window.location.pathname);
    }
    if (query.get("canceled")) {
      alert("Płatność anulowana.");
      window.history.pushState({}, document.title, window.location.pathname);
    }

    const savedItems = localStorage.getItem("saveEat_items");
    if (savedItems) setItems(JSON.parse(savedItems));
    
    const savedShoppingList = localStorage.getItem("saveEat_shoppingList");
    if (savedShoppingList) setShoppingList(JSON.parse(savedShoppingList));
    
    const savedCount = localStorage.getItem("saveEat_savedCount");
    if (savedCount) setSavedItemsCount(parseInt(savedCount, 10));

    const savedMoney = localStorage.getItem("saveEat_savings");
    if (savedMoney) setTotalSavings(parseFloat(savedMoney));

    const savedExpiry = localStorage.getItem("saveEat_premiumExpiry");
    if (savedExpiry) {
      const expiryDateObj = new Date(savedExpiry);
      if (new Date() > expiryDateObj) {
        setIsPremium(false); setPremiumExpiryDate(null);
        localStorage.removeItem("saveEat_isPremium"); localStorage.removeItem("saveEat_premiumExpiry");
      } else {
        setIsPremium(true); setPremiumExpiryDate(expiryDateObj.toLocaleDateString());
      }
    }

    const savedPointsToday = localStorage.getItem("saveEat_pointsToday");
    const savedDate = localStorage.getItem("saveEat_lastDate");
    const today = new Date().toISOString().split('T')[0];

    if (savedDate !== today) {
      setPointsToday(0); setLastPointDate(today);
      localStorage.setItem("saveEat_pointsToday", "0"); localStorage.setItem("saveEat_lastDate", today);
    } else {
      if (savedPointsToday) setPointsToday(parseInt(savedPointsToday, 10));
    }
  }, []);

  useEffect(() => { localStorage.setItem("saveEat_items", JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem("saveEat_shoppingList", JSON.stringify(shoppingList)); }, [shoppingList]);

  // --- OMINIĘCIE SERWERA VERCEL - BEZPOŚREDNIE SZUKANIE W LODÓWCE ---
  useEffect(() => {
    if (foodName.trim().length < 2) { setSuggestions([]); setSearchMessage(""); return; }
    if (!showSuggestions) return;
    
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true); setSearchMessage("Szukam... 🌍");
      try {
        const safeQuery = encodeURIComponent(foodName.trim());
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${safeQuery}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,brands,image_front_small_url,image_small_url,id`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data && data.products && data.products.length > 0) {
          const validProducts = data.products.filter((p: any) => p.product_name);
          setSuggestions(validProducts.length > 0 ? validProducts : [{ id: 'custom_item', product_name: `Dodaj własny wpis: "${foodName}"` }]);
          setSearchMessage(validProducts.length > 0 ? "" : "Brak w bazie.");
        } else {
          setSuggestions([{ id: 'custom_item', product_name: `Dodaj własny wpis: "${foodName}"` }]); setSearchMessage("Brak w bazie.");
        }
      } catch (error) {
        setSuggestions([{ id: 'custom_item', product_name: `Dodaj własny wpis: "${foodName}"` }]); setSearchMessage("Błąd połączenia.");
      } finally { setIsSearching(false); }
    }, 150); 
    return () => clearTimeout(delayDebounceFn);
  }, [foodName, showSuggestions]);

  // --- OMINIĘCIE SERWERA VERCEL - BEZPOŚREDNIE SZUKANIE W LIŚCIE ZAKUPÓW ---
  useEffect(() => {
    if (newShoppingItem.trim().length < 2) { 
      setShoppingSuggestions([]); setShoppingSearchMessage(""); return; 
    }
    if (!showShoppingSuggestions) return;
    
    const delayDebounceFn = setTimeout(async () => {
      setShoppingSearchMessage("Szukam... 🛒");
      try {
        const safeQuery = encodeURIComponent(newShoppingItem.trim());
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${safeQuery}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,brands,image_front_small_url,image_small_url,id`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.products && data.products.length > 0) {
          const validProducts = data.products.filter((p: any) => p.product_name);
          setShoppingSuggestions(validProducts.length > 0 ? validProducts : [{ id: 'custom_item', product_name: `Dodaj własny wpis: "${newShoppingItem}"` }]);
          setShoppingSearchMessage(validProducts.length > 0 ? "" : "Brak w bazie.");
        } else {
          setShoppingSuggestions([{ id: 'custom_item', product_name: `Dodaj własny wpis: "${newShoppingItem}"` }]);
          setShoppingSearchMessage("Brak w bazie.");
        }
      } catch (error) {
        setShoppingSuggestions([{ id: 'custom_item', product_name: `Dodaj własny wpis: "${newShoppingItem}"` }]);
        setShoppingSearchMessage("Błąd połączenia.");
      }
    }, 150); 
    return () => clearTimeout(delayDebounceFn);
  }, [newShoppingItem, showShoppingSuggestions]);

  const handleCameraUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800; const MAX_HEIGHT = 800;
      let width = img.width; let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }

      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(objectUrl);

      try {
        const res = await fetch('/api/scan-receipt', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: compressedBase64 }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.products && data.products.length > 0) {
            const newItems = data.products.map((prod: any) => {
              const expDate = new Date(); expDate.setDate(expDate.getDate() + (prod.days || 7));
              return { id: Date.now().toString() + Math.random().toString(), name: prod.name, expiryDate: expDate.toISOString().split('T')[0], addedAt: Date.now() };
            });
            setItems(prev => [...prev, ...newItems]);
            alert(`📸 AI rozpoznało ${data.products.length} produktów z obrazka!\nWszystko wylądowało w lodówce.`);
          } else { alert("❌ AI nie znalazło żadnego jedzenia na zdjęciu."); }
        } else {
          const errorData = await res.json().catch(() => ({}));
          alert(`❌ Błąd analizy: ${errorData.error || "Spróbuj zrobić wyraźniejsze zdjęcie."}`);
        }
      } catch (error) { alert("❌ Błąd połączenia z serwerem AI. Sprawdź internet."); } 
      finally { setIsScanning(false); if (cameraInputRef.current) cameraInputRef.current.value = ""; }
    };
    img.src = objectUrl;
  };

  const handleBarcodeScanResult = async (barcode: string) => {
    setIsBarcodeScannerOpen(false);
    setIsModalOpen(true);
    setFoodName("Pobieranie kodu " + barcode + "... ⏳");
    
    const product = await searchProductByBarcode(barcode);
    
    if (product) {
      const fullName = product.brand ? `${product.name} (${product.brand})` : product.name;
      setFoodName(fullName);
      const newDate = new Date(); newDate.setDate(newDate.getDate() + 7);
      setExpiryDate(newDate.toISOString().split('T')[0]);
    } else {
      setFoodName("");
      alert(`❌ Nie znaleziono kodu: ${barcode}. Wpisz nazwę ręcznie.`);
    }
  };

  const handleChefClick = async () => {
    if (items.length === 0) { alert("Twoja lodówka jest pusta! Zrób zakupy, zanim zaczniesz gotować."); return; }
    setIsChefOpen(true); setIsGeneratingRecipe(true); setGeneratedRecipe("");
    
    try {
      const ingredientNames = items.slice(0, 8).map(i => i.name);
      const res = await fetch('/api/generate-recipe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients: ingredientNames }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedRecipe(data.recipe || "Przepis gotowy, ale zabrakło tekstu.");
        if (data.missing && data.missing.length > 0) {
          const newShoppingItems = data.missing.map((missingName: string) => ({ id: Date.now().toString() + Math.random().toString(), name: missingName }));
          setShoppingList(prev => [...prev, ...newShoppingItems]);
        }
      } else { setGeneratedRecipe("Niestety, kucharz ma przerwę. Spróbuj ponownie za chwilę! 👨‍🍳"); }
    } catch (error) { setGeneratedRecipe("Błąd połączenia z serwerem AI. Sprawdź internet i spróbuj ponownie."); } 
    finally { setIsGeneratingRecipe(false); }
  };

  const handleBuyPremiumReal = async () => {
    if (!isSignedIn) { alert("Musisz się zalogować, zanim kupisz Premium!"); return; }
    try {
      const response = await fetch('/api/checkout', { method: 'POST' });
      const data = await response.json();
      if (data.url) { window.location.href = data.url; } else { alert("Błąd: Serwer nie zwrócił linku do płatności."); }
    } catch (error) { alert("Błąd połączenia z serwerem płatności."); }
  };

  const handleAddItem = () => {
    if (foodName.trim() !== "" && expiryDate !== "") {
      setItems([...items, { id: Date.now().toString(), name: foodName, expiryDate: expiryDate, addedAt: Date.now() }]);
      setFoodName(""); setExpiryDate(""); setIsModalOpen(false);
    } else { alert("Pamiętaj, aby wpisać nazwę i wybrać datę ważności!"); }
  };

  const handleAddShoppingItem = () => {
    if (newShoppingItem.trim() !== "") {
      setShoppingList([...shoppingList, { id: Date.now().toString(), name: newShoppingItem }]);
      setNewShoppingItem(""); setShowShoppingSuggestions(false);
    }
  };

  const handleSelectShoppingProduct = (product: any) => {
    if (product.id !== 'custom_item') {
      const nameToAdd = product.brands ? `${product.product_name} (${product.brands})` : product.product_name;
      setShoppingList(prev => [...prev, { id: Date.now().toString(), name: nameToAdd }]);
    } else { setShoppingList(prev => [...prev, { id: Date.now().toString(), name: newShoppingItem }]); }
    setNewShoppingItem(""); setShowShoppingSuggestions(false); setShoppingSuggestions([]);
  };

  const handleEatItem = (idToRemove: string) => {
    if (pointsToday >= 3 && !isPremium) { alert("🛑 Dzienny limit osiągnięty (3/3)! Wróć jutro lub odblokuj Premium, aby usunąć limit."); return; }
    setItems(items.filter((item) => item.id !== idToRemove));
    const newTotalCount = savedItemsCount + 1; const newDailyCount = pointsToday + 1;
    setSavedItemsCount(newTotalCount); setPointsToday(newDailyCount);
    localStorage.setItem("saveEat_savedCount", newTotalCount.toString()); localStorage.setItem("saveEat_pointsToday", newDailyCount.toString()); 
    const newSavings = totalSavings + 8.50; setTotalSavings(newSavings); localStorage.setItem("saveEat_savings", newSavings.toString());
  };

  const handleDeleteMistake = (idToRemove: string) => setItems(items.filter((item) => item.id !== idToRemove));

  const handleClaimReward = async (cost: number, title: string) => {
    if (savedItemsCount >= cost) {
      const userEmail = window.prompt(`🎉 Odblokowałeś nagrodę: ${title}!\n\nPodaj swój adres e-mail, na który mamy wysłać E-booka:`);
      if (userEmail && userEmail.includes("@")) {
        setSavedItemsCount(savedItemsCount - cost); localStorage.setItem("saveEat_savedCount", (savedItemsCount - cost).toString());
        alert("Wysyłam E-booka na Twój adres e-mail... ⏳");
        try {
          const response = await fetch('/api/send-ebook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail }) });
          if (response.ok) { alert(`📧 Sukces! E-book został wysłany na adres:\n${userEmail}\n\nSprawdź swoją skrzynkę (i folder SPAM).`); setIsRewardsOpen(false); } 
          else { alert("❌ Serwer napotkał problem przy wysyłaniu e-maila."); }
        } catch (error) { alert("❌ Błąd połączenia z serwerem wysyłkowym."); }
      } else if (userEmail !== null) { alert("❌ Podano nieprawidłowy adres e-mail."); }
    } else { alert(`❌ Brakuje Ci ${cost - savedItemsCount} punktów do tej nagrody.`); }
  };

  const calculateDaysLeft = (expiryDateStr: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0); const expDate = new Date(expiryDateStr);
    return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)); 
  };

  const sortedItems = [...items].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const handleSelectProduct = (product: any) => {
    if (product.id !== 'custom_item') { setFoodName(product.brands ? `${product.product_name} (${product.brands})` : product.product_name); }
    setShowSuggestions(false); setSuggestions([]);
    const newDate = new Date(); newDate.setDate(newDate.getDate() + 7);
    setExpiryDate(newDate.toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleCameraUpload} className="hidden" />

      {isBarcodeScannerOpen && (
        <BarcodeScannerModal 
          onResult={handleBarcodeScanResult} 
          onClose={() => { setIsBarcodeScannerOpen(false); setIsModalOpen(true); }} 
        />
      )}

      <div className="relative w-full h-48 sm:h-64 bg-green-800 overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg mb-2">SaveEat <span className="text-green-400">🥦</span></h1>
          <p className="text-green-50 font-medium text-lg max-w-lg drop-shadow-md">Mniej marnowania, więcej oszczędności. Dołącz do rewolucji Zero Waste.</p>
        </div>
      </div>

      <div className="flex-grow p-4 sm:p-6 pb-20 -mt-6 sm:-mt-10 relative z-10">
        <header className="mb-6 flex flex-col sm:flex-row items-center justify-center sm:justify-between max-w-3xl mx-auto gap-4 bg-white p-4 rounded-2xl shadow-md border border-gray-100">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
            <div className="flex items-center gap-3">
              {!isLoaded ? ( <div className="animate-pulse w-8 h-8 bg-gray-200 rounded-full"></div>
              ) : !isSignedIn ? (
                <div className="flex gap-2">
                  <SignInButton mode="modal"><button className="text-gray-600 hover:text-green-600 font-bold px-4 py-2 border border-gray-300 rounded-xl hover:border-green-600 transition-colors">Logowanie</button></SignInButton>
                  <SignUpButton mode="modal"><button className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl transition-colors">Rejestracja</button></SignUpButton>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                  <UserButton afterSignOutUrl="/" />
                  <span className="font-bold text-sm hidden sm:block">Witaj, {user?.firstName || 'Użytkowniku'}</span>
                </div>
              )}
            </div>
            <button onClick={() => setIsRewardsOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"><span>🎁</span> <span className="hidden sm:inline">Nagrody</span></button>
            
            {!isPremium ? (
              <button onClick={() => setIsPremiumModalOpen(true)} className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 px-4 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 border border-amber-300"><span>👑</span> <span className="hidden sm:inline">Kup Premium</span></button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => cameraInputRef.current?.click()} disabled={isScanning} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 border border-amber-400">
                  {isScanning ? <span className="animate-spin">⏳</span> : <span>📸</span>} <span className="hidden sm:inline">{isScanning ? "Analizuję..." : "Aparat AI"}</span>
                </button>
                <button onClick={() => setIsPremiumModalOpen(true)} className="text-amber-600 hover:text-amber-700 font-bold px-3 py-2 transition-colors border border-amber-300 rounded-xl hover:bg-amber-50 flex items-center gap-1"><span>💳</span> Przedłuż</button>
              </div>
            )}
            <button onClick={() => { setIsModalOpen(true); setShowSuggestions(true); }} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-1 ml-auto"><span>+</span> <span className="hidden sm:inline">Dodaj produkt</span></button>
          </div>
        </header>

        {isPremium && (
          <div className="max-w-3xl mx-auto mb-4 text-center text-sm font-medium text-amber-600 bg-amber-50 py-2 rounded-xl border border-amber-200 shadow-sm">Konto Premium aktywne. Ważne do: <span className="font-bold">{premiumExpiryDate}</span></div>
        )}

        <div className="max-w-3xl mx-auto mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-3xl p-6 text-white shadow-lg flex justify-between items-center cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setIsRewardsOpen(true)}>
            <div><h3 className="text-xl font-bold mb-1 flex items-center gap-2"><span>Wpływ na planetę</span> 🌍</h3><p className="text-green-100 font-medium text-sm">Dziś uratowano: {pointsToday}/3</p></div>
            <div className="text-4xl font-extrabold drop-shadow-md bg-white/20 px-4 py-2 rounded-2xl">{savedItemsCount}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-6 text-white shadow-lg flex justify-between items-center hover:scale-[1.02] transition-transform">
            <div><h3 className="text-xl font-bold mb-1 flex items-center gap-2"><span>Zatrzymane w portfelu</span> 💰</h3><p className="text-blue-100 font-medium text-sm">Tyle pieniędzy zaoszczędziłeś</p></div>
            <div className="text-3xl font-extrabold drop-shadow-md bg-white/20 px-4 py-2 rounded-2xl">{totalSavings.toFixed(2)} zł</div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mb-8">
          <button onClick={handleChefClick} className="w-full bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 text-orange-800 font-extrabold text-lg py-4 rounded-2xl shadow-sm transition-colors flex items-center justify-center gap-3"><span className="text-3xl">👨‍🍳</span> Co dzisiaj gotuję z resztek?</button>
        </div>

        <main className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-3xl mx-auto min-h-[250px] mb-8">
          {sortedItems.length === 0 ? (
            <div className="flex flex-col items-center py-6"><div className="text-7xl mb-6 opacity-80">🧊</div><h2 className="text-2xl font-bold mb-3 text-gray-800">Twoja lodówka jest pusta</h2><p className="text-gray-500 text-center text-lg max-w-md mb-6">Czas uratować trochę jedzenia przed zmarnowaniem!</p></div>
          ) : (
            <div className="w-full">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Zawartość lodówki:</h2>
              <ul className="space-y-4">
                {sortedItems.map((item) => {
                  const daysLeft = calculateDaysLeft(item.expiryDate);
                  let statusColor = "text-green-700 bg-green-100 border-green-300"; let statusText = `Świeże (${daysLeft} dni)`;
                  if (daysLeft < 0) { statusColor = "text-red-700 bg-red-100 border-red-300"; statusText = `Przeterminowane (${Math.abs(daysLeft)} dni temu)`; }
                  else if (daysLeft <= 3) { statusColor = "text-orange-700 bg-orange-100 border-orange-300"; statusText = `Zjedz szybko! (${daysLeft} dni)`; }

                  return (
                    <li key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all gap-4">
                      <div className="flex flex-col gap-1.5"><span className="font-bold text-lg text-gray-800 capitalize">{item.name}</span><span className={`text-xs font-bold px-2.5 py-1 rounded-md border w-fit ${statusColor}`}>⏳ {statusText}</span></div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => handleDeleteMistake(item.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg font-bold transition-colors border border-transparent">🗑️</button>
                        <button onClick={() => handleEatItem(item.id)} className="flex-1 sm:flex-none text-green-600 hover:text-white hover:bg-green-600 px-4 py-2 rounded-lg font-bold transition-colors border border-green-200 hover:border-transparent flex justify-center items-center gap-2 shadow-sm"><span>Zjedzone</span> <span className="text-lg">🍽️</span></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="w-full mt-10 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">🛒 Lista Zakupów</h2>
            <div className="relative flex gap-2 mb-6 w-full">
              <div className="relative flex-grow">
                <input type="text" value={newShoppingItem} onChange={(e) => { setNewShoppingItem(e.target.value); setShowShoppingSuggestions(true); }} onKeyDown={(e) => e.key === 'Enter' && handleAddShoppingItem()} placeholder="Co jeszcze kupić? (np. Mleko)" className="w-full p-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30 font-medium text-gray-700 pr-24" />
                {shoppingSearchMessage && <div className="absolute right-3 top-3.5 font-bold text-sm text-blue-400">{shoppingSearchMessage}</div>}
                {showShoppingSuggestions && shoppingSuggestions.length > 0 && (
                  <ul className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {shoppingSuggestions.map((product, index) => {
                      const hasImage = product.image_front_small_url || product.image_small_url;
                      return (
                        <li key={product.id || index} onMouseDown={() => handleSelectShoppingProduct(product)} className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors">
                          <div className="w-10 h-10 flex-shrink-0 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden text-xl shadow-sm">
                            {hasImage ? <img src={hasImage} alt="produkt" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '🛒'; }} /> : '🛒'}
                          </div>
                          <div className="flex flex-col"><span className="font-bold text-sm text-gray-800">{product.product_name}</span>{product.brands && <span className="text-xs font-medium text-gray-500">{product.brands}</span>}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <button onClick={handleAddShoppingItem} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold transition-colors shadow-sm flex-shrink-0">Dodaj</button>
            </div>

            {shoppingList.length === 0 ? (
              <p className="text-gray-400 text-center py-4 font-medium italic">Lista jest pusta. Kucharz AI też może tu dorzucić braki z przepisu!</p>
            ) : (
              <>
                <ul className="space-y-3">
                  {shoppingList.map(item => (
                    <li key={item.id} className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                      <span className="font-bold text-blue-900 capitalize">{item.name}</span>
                      <button onClick={() => setShoppingList(shoppingList.filter(i => i.id !== item.id))} className="text-blue-600 hover:text-white hover:bg-blue-600 px-4 py-2 rounded-lg font-bold transition-colors border border-blue-200 hover:border-transparent shadow-sm">Kupione ✔️</button>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 text-center"><button onClick={() => setShoppingList([])} className="text-sm font-bold text-gray-400 hover:text-red-500 transition-colors">Wyczyść całą listę</button></div>
              </>
            )}
          </div>
        </main>
      </div>

      <footer className="mt-auto bg-gray-900 text-gray-300 py-10 text-center relative z-10">
        <div className="max-w-2xl mx-auto px-6">
          <p className="font-extrabold text-2xl mb-2 text-white tracking-tight">SaveEat 🥦</p>
          <p className="text-sm mb-6 text-gray-400">Polska aplikacja walcząca z marnowaniem żywności. Dołącz do naszej misji i oszczędzaj środowisko (oraz portfel!).</p>
          <div className="pt-6 border-t border-gray-700 text-sm flex flex-col items-center gap-2">
            <p>Masz problem z aplikacją lub płatnościami?</p>
            <a href="mailto:support@saveeat.pl" className="bg-gray-800 hover:bg-gray-700 text-green-400 px-4 py-2 rounded-lg font-bold inline-block transition-colors border border-gray-700 hover:border-green-500">Napisz do nas: support@saveeat.pl</a>
          </div>
        </div>
      </footer>

      {isChefOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsChefOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl font-bold">✕</button>
            <h2 className="text-2xl font-bold text-orange-600 mb-6 flex items-center gap-2">👨‍🍳 Szef Kuchni AI</h2>
            {isGeneratingRecipe ? (
              <div className="flex flex-col items-center py-8"><div className="text-5xl animate-bounce mb-4">🥘</div><p className="text-gray-500 font-bold animate-pulse text-center">Analizuję Twoją lodówkę<br/>i wymyślam pyszny przepis...</p></div>
            ) : (
              <div className="bg-orange-50 p-6 rounded-xl border border-orange-200 whitespace-pre-wrap text-gray-800 font-medium leading-relaxed shadow-inner text-sm">{generatedRecipe}</div>
            )}
            <button onClick={() => setIsChefOpen(false)} className="mt-6 w-full px-5 py-3 bg-orange-500 hover:bg-orange-600 transition-colors text-white font-bold rounded-xl shadow-md">Dzięki, idę gotować!</button>
          </div>
        </div>
      )}

      {isPremiumModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-amber-50 to-white p-8 rounded-3xl shadow-2xl w-full max-w-md relative border-t-4 border-amber-400">
            <button onClick={() => setIsPremiumModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl font-bold">✕</button>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">👑</div>
              <h2 className="text-3xl font-extrabold text-amber-600 mb-2">SaveEat Premium</h2>
              <p className="text-gray-500 font-medium mb-4">{isPremium ? `Twoje premium wygasa: ${premiumExpiryDate}. Przedłuż swój dostęp!` : "Odblokuj pełną moc sztucznej inteligencji."}</p>
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl py-3 px-4 inline-block mb-2">
                <p className="text-3xl font-black text-gray-900">19,99 zł <span className="text-sm font-bold text-gray-400">/ miesiąc</span></p>
              </div>
            </div>
            <ul className="space-y-3 mb-8 text-gray-700">
              <li className="flex items-center gap-3">✅ <span className="font-bold">Skaner paragonów AI</span></li>
              <li className="flex items-center gap-3">✅ Limit punktów usunięty</li>
              <li className="flex items-center gap-3">✅ Wyszukiwanie produktów premium</li>
            </ul>
            <button onClick={handleBuyPremiumReal} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all text-lg">
              {isPremium ? "💳 Zapłać i odblokuj Premium" : "💳 Kup bezpiecznie"}
            </button>
          </div>
        </div>
      )}

      {isRewardsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsRewardsOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors font-bold">✕</button>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2"><span>🎁</span> Odbierz Nagrody</h2>
            <p className="text-gray-500 mb-6 border-b pb-4">Wymień swoje punkty. Twoje punkty: <span className="font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">{savedItemsCount} pkt</span></p>
            <div className="space-y-4">
              {REWARDS_CATALOG.map((reward) => (
                <div key={reward.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md transition-all gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl bg-white w-14 h-14 rounded-xl flex items-center justify-center shadow-sm border border-gray-100 flex-shrink-0">{reward.icon}</div>
                    <div><h4 className="font-bold text-gray-800 text-lg">{reward.title}</h4><p className="text-sm text-gray-500">{reward.description}</p></div>
                  </div>
                  <button onClick={() => handleClaimReward(reward.cost, reward.title)} className={`w-full sm:w-auto flex-shrink-0 px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95 ${savedItemsCount >= reward.cost ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Odbierz ({reward.cost} pkt)</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md relative">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Dodaj produkt</h2>
              <button onClick={() => { setIsModalOpen(false); setIsBarcodeScannerOpen(true); }} className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border border-green-200 shadow-sm">
                <span>📷</span> Skanuj Kod
              </button>
            </div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nazwa produktu</label>
            <div className="relative mb-6">
              <input type="text" value={foodName} onChange={(e) => { setFoodName(e.target.value); setShowSuggestions(true); }} placeholder="Wpisz np. Ketchup, Nutella, Cola..." className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50" />
              {searchMessage && <div className="absolute right-4 top-4 font-bold text-sm text-gray-400">{searchMessage}</div>}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  {suggestions.map((product, index) => {
                    const hasImage = product.image_front_small_url || product.image_small_url;
                    return (
                      <li key={product.id || index} onMouseDown={() => handleSelectProduct(product)} className="flex items-center gap-3 p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors">
                        <div className="w-12 h-12 flex-shrink-0 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden text-2xl shadow-sm">
                          {hasImage ? <img src={hasImage} alt="produkt" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '📦'; }} /> : '📦'}
                        </div>
                        <div className="flex flex-col"><span className="font-bold text-sm text-gray-800">{product.product_name}</span>{product.brands && <span className="text-xs font-medium text-gray-500">{product.brands}</span>}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Data ważności</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl mb-8 focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 font-medium text-gray-700" />
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => { setIsModalOpen(false); setFoodName(""); setExpiryDate(""); setSuggestions([]); }} className="px-5 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors w-full sm:w-auto">Anuluj</button>
              <button onClick={handleAddItem} className="px-5 py-3 bg-green-600 text-white font-bold hover:bg-green-700 rounded-xl transition-colors shadow-md w-full sm:w-auto">Zapisz</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}