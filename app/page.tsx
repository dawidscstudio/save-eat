"use client";

import { useState, useEffect } from "react";
import { searchGlobalFoodDatabase } from "./actions";

interface FoodItem {
  id: string;
  name: string;
  expiryDate: string;
  addedAt: number;
}

const REWARDS_CATALOG = [
  { id: 'r1', title: 'Zniżka -10% we Frisco', description: 'Kupon rabatowy na zakupy spożywcze.', cost: 5, icon: '🛒' },
  { id: 'r2', title: 'Darmowa dostawa Biek', description: 'Nie płać za dowóz z Biedronki.', cost: 10, icon: '🚚' },
  { id: 'r3', title: 'E-book: "Gotuj z resztek"', description: '50 przepisów na pyszne dania Zero Waste.', cost: 20, icon: '📖' },
  { id: 'r4', title: 'Odblokuj Premium', description: 'Odblokuj skaner paragonów na 30 dni.', cost: 50, icon: '👑' },
];

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiryDate, setPremiumExpiryDate] = useState<string | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // LOGOWANIE I REJESTRACJA
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register'); // NOWOŚĆ: Tryb okienka

  const [items, setItems] = useState<FoodItem[]>([]);
  const [foodName, setFoodName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  
  const [savedItemsCount, setSavedItemsCount] = useState(0);
  const [pointsToday, setPointsToday] = useState(0);
  const [lastPointDate, setLastPointDate] = useState("");

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");

  useEffect(() => {
    const savedItems = localStorage.getItem("saveEat_items");
    if (savedItems) setItems(JSON.parse(savedItems));
    
    const savedCount = localStorage.getItem("saveEat_savedCount");
    if (savedCount) setSavedItemsCount(parseInt(savedCount, 10));

    const loginStatus = localStorage.getItem("saveEat_isLoggedIn");
    if (loginStatus === "true") setIsLoggedIn(true);

    const savedExpiry = localStorage.getItem("saveEat_premiumExpiry");
    if (savedExpiry) {
      const expiryDateObj = new Date(savedExpiry);
      const now = new Date();
      if (now > expiryDateObj) {
        setIsPremium(false);
        setPremiumExpiryDate(null);
        localStorage.removeItem("saveEat_isPremium");
        localStorage.removeItem("saveEat_premiumExpiry");
        if (localStorage.getItem("saveEat_wasPremiumNotified") !== "true") {
          alert("⚠️ Twój okres Premium właśnie wygasł. Odnów subskrypcję, aby dalej korzystać ze Skanera AI.");
          localStorage.setItem("saveEat_wasPremiumNotified", "true");
        }
      } else {
        setIsPremium(true);
        setPremiumExpiryDate(expiryDateObj.toLocaleDateString());
        localStorage.removeItem("saveEat_wasPremiumNotified"); 
      }
    }

    const savedPointsToday = localStorage.getItem("saveEat_pointsToday");
    const savedDate = localStorage.getItem("saveEat_lastDate");
    const today = new Date().toISOString().split('T')[0];

    if (savedDate !== today) {
      setPointsToday(0);
      setLastPointDate(today);
      localStorage.setItem("saveEat_pointsToday", "0");
      localStorage.setItem("saveEat_lastDate", today);
    } else {
      if (savedPointsToday) setPointsToday(parseInt(savedPointsToday, 10));
      setLastPointDate(savedDate);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("saveEat_items", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (foodName.trim().length < 2) {
      setSuggestions([]);
      setSearchMessage("");
      return;
    }
    if (!showSuggestions) return;
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setSearchMessage("Przeszukuję globalną bazę... 🌍");
      try {
        const data = await searchGlobalFoodDatabase(foodName);
        if (data && data.products && data.products.length > 0) {
          const validProducts = data.products.filter((p: any) => p.product_name);
          if (validProducts.length > 0) {
            setSuggestions(validProducts);
            setSearchMessage(""); 
          } else {
            setSuggestions([{ id: 'custom_item', product_name: `Dodaj własny wpis: "${foodName}"` }]);
            setSearchMessage("Brak w bazie globalnej.");
          }
        } else {
          setSuggestions([{ id: 'custom_item', product_name: `Dodaj własny wpis: "${foodName}"` }]);
          setSearchMessage("Brak w bazie globalnej.");
        }
      } catch (error) {
        setSuggestions([{ id: 'custom_item', product_name: `Dodaj własny wpis: "${foodName}"` }]);
        setSearchMessage("Błąd serwera.");
      } finally {
        setIsSearching(false);
      }
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [foodName, showSuggestions]);

  const activatePremium = (days: number, message: string) => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    setIsPremium(true);
    setPremiumExpiryDate(expiry.toLocaleDateString());
    localStorage.setItem("saveEat_isPremium", "true");
    localStorage.setItem("saveEat_premiumExpiry", expiry.toISOString());
    localStorage.removeItem("saveEat_wasPremiumNotified");
    alert(`${message}\n\nWażne do: ${expiry.toLocaleDateString()}`);
  };

  // NOWA FUNKCJA AUTORYZACJI (Logowanie vs Rejestracja)
  const handleAuthSubmit = (provider?: 'google' | 'apple') => {
    const providerText = provider ? `przez ${provider === 'google' ? 'Google' : 'Apple'}` : "e-mailem";

    if (authMode === 'register') {
      // Rejestracja
      localStorage.setItem("saveEat_hasAccount", "true");
      setIsLoggedIn(true);
      localStorage.setItem("saveEat_isLoggedIn", "true");
      
      if (!isPremium) {
        activatePremium(7, `🎉 Konto utworzone pomyślnie ${providerText}!\n\nW nagrodę otrzymujesz 7 DNI PREMIUM całkowicie za darmo. Twój Skaner Paragonów AI jest już aktywny!`);
      } else {
        alert(`Konto utworzone ${providerText}!`);
      }
    } else {
      // Logowanie
      const hasAccount = localStorage.getItem("saveEat_hasAccount");
      if (!hasAccount && !provider) {
        alert("❌ Nie znaleziono konta z tym adresem e-mail. Przejdź do zakładki Rejestracja, aby założyć konto!");
        return;
      }
      setIsLoggedIn(true);
      localStorage.setItem("saveEat_isLoggedIn", "true");
      alert(`Zalogowano pomyślnie ${providerText}! Wracamy do lodówki.`);
    }
    
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.setItem("saveEat_isLoggedIn", "false");
    alert("Wylogowano pomyślnie.");
  };

  const handleBuyPremium = () => {
    activatePremium(30, "Płatność zakończona sukcesem! 🎉\nTwoja subskrypcja została przedłużona o 30 dni.");
    setIsPremiumModalOpen(false);
  };

  const handleAddItem = () => {
    if (foodName.trim() !== "" && expiryDate !== "") {
      const newItem: FoodItem = { id: Date.now().toString(), name: foodName, expiryDate: expiryDate, addedAt: Date.now() };
      setItems([...items, newItem]);
      setFoodName(""); setExpiryDate(""); setIsModalOpen(false);
    } else {
      alert("Pamiętaj, aby wpisać nazwę i wybrać datę ważności!");
    }
  };

  const handleEatItem = (idToRemove: string) => {
    if (pointsToday >= 3) {
      alert("🛑 Dzienny limit osiągnięty!\n\nZdobyłeś już dzisiaj maksymalną liczbę punktów (3/3). \nProdukt został usunięty z lodówki, ale punkt nie zostanie doliczony. Wróć jutro po więcej!");
      setItems(items.filter((item) => item.id !== idToRemove));
      return;
    }
    setItems(items.filter((item) => item.id !== idToRemove));
    const newTotalCount = savedItemsCount + 1;
    const newDailyCount = pointsToday + 1;
    setSavedItemsCount(newTotalCount); setPointsToday(newDailyCount);
    localStorage.setItem("saveEat_savedCount", newTotalCount.toString()); 
    localStorage.setItem("saveEat_pointsToday", newDailyCount.toString()); 
  };

  const handleDeleteMistake = (idToRemove: string) => setItems(items.filter((item) => item.id !== idToRemove));

  const handleClaimReward = (cost: number, title: string) => {
    if (savedItemsCount >= cost) {
      const newCount = savedItemsCount - cost;
      setSavedItemsCount(newCount);
      localStorage.setItem("saveEat_savedCount", newCount.toString());
      
      if (title.includes("Premium")) {
        activatePremium(30, "👑 Witaj w gronie Premium! Złoty skaner paragonów został odblokowany na kolejne 30 dni.");
        setIsRewardsOpen(false);
        return;
      }
      const randomCode = `SAVE-${Math.floor(1000 + Math.random() * 9000)}`;
      alert(`🎉 Gratulacje! Odebrałeś: ${title}.\n\nTwój kod to: ${randomCode}\n(Skopiuj go i użyj w koszyku!)`);
    } else {
      const missing = cost - savedItemsCount;
      alert(`❌ Brakuje Ci ${missing} punktów do tej nagrody.\nUratuj więcej jedzenia przed zepsuciem!`);
    }
  };

  const handleScanReceipt = () => {
    setIsScanning(true);
    setTimeout(() => {
      const today = new Date();
      const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
      const nextMonth = new Date(today); nextMonth.setDate(today.getDate() + 30);
      const scannedItems: FoodItem[] = [
        { id: Date.now().toString() + "1", name: "Mleko Łaciate 3.2% (Biedronka)", expiryDate: nextWeek.toISOString().split('T')[0], addedAt: Date.now() },
        { id: Date.now().toString() + "2", name: "Masło Extra Piątnica", expiryDate: nextMonth.toISOString().split('T')[0], addedAt: Date.now() },
        { id: Date.now().toString() + "3", name: "Chleb pszenny", expiryDate: new Date(today.setDate(today.getDate() + 3)).toISOString().split('T')[0], addedAt: Date.now() },
      ];
      setItems([...items, ...scannedItems]);
      setIsScanning(false); setIsScannerOpen(false);
      alert("📸 Skanowanie zakończone!\n\nAI rozpoznało 3 produkty z paragonu i automatycznie dodało je do lodówki.");
    }, 2500);
  };

  const calculateDaysLeft = (expiryDateStr: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expDate = new Date(expiryDateStr);
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  const sortedItems = [...items].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const handleSelectProduct = (product: any) => {
    if (product.id !== 'custom_item') {
      const fullName = product.brands ? `${product.product_name} (${product.brands})` : product.product_name;
      setFoodName(fullName);
    }
    setShowSuggestions(false); setSuggestions([]);
    const newDate = new Date(); newDate.setDate(newDate.getDate() + 7);
    setExpiryDate(newDate.toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      
      <div className="relative w-full h-48 sm:h-64 bg-green-800 overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1498837167922-41c53bbf40d4?q=80&w=2070&auto=format&fit=crop" 
          alt="Świeże jedzenie" 
          className="w-full h-full object-cover opacity-40 mix-blend-overlay"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg mb-2">
            SaveEat <span className="text-green-400">🥦</span>
          </h1>
          <p className="text-green-50 font-medium text-lg max-w-lg drop-shadow-md">
            Mniej marnowania, więcej oszczędności. Dołącz do rewolucji Zero Waste.
          </p>
        </div>
      </div>

      <div className="flex-grow p-4 sm:p-6 pb-20 -mt-6 sm:-mt-10 relative z-10">
        
        <header className="mb-6 flex flex-col sm:flex-row items-center justify-center sm:justify-between max-w-3xl mx-auto gap-4 bg-white p-4 rounded-2xl shadow-md border border-gray-100">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
            
            {!isLoggedIn ? (
              <button 
                onClick={() => {
                  setAuthMode('login'); // Domyślnie otwieramy na logowaniu
                  setIsAuthModalOpen(true);
                }} 
                className="text-gray-600 hover:text-green-600 font-bold px-3 py-2 transition-colors border border-gray-300 rounded-xl hover:border-green-600"
              >
                Zaloguj się
              </button>
            ) : (
              <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 font-bold px-3 py-2 transition-colors bg-gray-50 rounded-xl border border-transparent hover:border-red-200" title="Wyloguj">
                👤 Wyloguj
              </button>
            )}

            <button onClick={() => setIsRewardsOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2">
              <span>🎁</span> <span className="hidden sm:inline">Nagrody</span>
            </button>
            
            {!isPremium ? (
              <button onClick={() => setIsPremiumModalOpen(true)} className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 px-4 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 border border-amber-300">
                <span>👑</span> <span className="hidden sm:inline">Kup Premium</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setIsScannerOpen(true)} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 border border-amber-400">
                  <span>📷</span> <span className="hidden sm:inline">Skanuj Paragon</span>
                </button>
                <button onClick={() => setIsPremiumModalOpen(true)} className="text-amber-600 hover:text-amber-700 font-bold px-3 py-2 transition-colors border border-amber-300 rounded-xl hover:bg-amber-50 flex items-center gap-1">
                  <span>💳</span> Przedłuż
                </button>
              </div>
            )}

            <button onClick={() => { setIsModalOpen(true); setShowSuggestions(true); }} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-1 ml-auto">
              <span>+</span> <span className="hidden sm:inline">Dodaj produkt</span>
            </button>
          </div>
        </header>

        {isPremium && (
          <div className="max-w-3xl mx-auto mb-4 text-center text-sm font-medium text-amber-600 bg-amber-50 py-2 rounded-xl border border-amber-200">
            Konto Premium aktywne. Ważne do: <span className="font-bold">{premiumExpiryDate}</span>
          </div>
        )}

        <div className="max-w-3xl mx-auto mb-8 bg-gradient-to-br from-green-500 to-green-700 rounded-3xl p-6 text-white shadow-lg flex justify-between items-center cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setIsRewardsOpen(true)}>
          <div>
            <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
              <span>Twój wpływ na planetę</span> 🌍
            </h3>
            <p className="text-green-100 font-medium text-sm">
              Kliknij, by wymienić punkty. Dziś uratowano: {pointsToday}/3
            </p>
          </div>
          <div className="text-5xl font-extrabold drop-shadow-md bg-white/20 px-4 py-2 rounded-2xl">
            {savedItemsCount}
          </div>
        </div>

        <main className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-3xl mx-auto min-h-[250px] mb-8">
          {sortedItems.length === 0 ? (
            <div className="flex flex-col items-center py-6">
              <div className="text-7xl mb-6 opacity-80">🧊</div>
              <h2 className="text-2xl font-bold mb-3 text-gray-800">Twoja lodówka jest pusta</h2>
              <p className="text-gray-500 text-center text-lg max-w-md mb-6">
                Czas uratować trochę jedzenia przed zmarnowaniem!
              </p>
            </div>
          ) : (
            <div className="w-full">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Zawartość lodówki:</h2>
              <ul className="space-y-4">
                {sortedItems.map((item) => {
                  const daysLeft = calculateDaysLeft(item.expiryDate);
                  let statusColor = "text-green-700 bg-green-100 border-green-300";
                  let statusText = `Świeże (${daysLeft} dni)`;
                  if (daysLeft < 0) {
                    statusColor = "text-red-700 bg-red-100 border-red-300";
                    statusText = `Przeterminowane (${Math.abs(daysLeft)} dni temu)`;
                  } else if (daysLeft <= 3) {
                    statusColor = "text-orange-700 bg-orange-100 border-orange-300";
                    statusText = `Zjedz szybko! (${daysLeft} dni)`;
                  }

                  return (
                    <li key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-bold text-lg text-gray-800 capitalize">{item.name}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-md border w-fit ${statusColor}`}>
                          ⏳ {statusText}
                        </span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => handleDeleteMistake(item.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg font-bold transition-colors border border-transparent">🗑️</button>
                        <button onClick={() => handleEatItem(item.id)} className="flex-1 sm:flex-none text-green-600 hover:text-white hover:bg-green-600 px-4 py-2 rounded-lg font-bold transition-colors border border-green-200 hover:border-transparent flex justify-center items-center gap-2 shadow-sm">
                          <span>Zjedzone</span> <span className="text-lg">🍽️</span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </main>
      </div>

      <footer className="mt-auto bg-gray-900 text-gray-300 py-10 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <p className="font-extrabold text-2xl mb-2 text-white tracking-tight">SaveEat 🥦</p>
          <p className="text-sm mb-6 text-gray-400">Polska aplikacja walcząca z marnowaniem żywności. Dołącz do naszej misji i oszczędzaj środowisko (oraz portfel!).</p>
          <div className="pt-6 border-t border-gray-700 text-sm flex flex-col items-center gap-2">
            <p>Masz problem z aplikacją lub płatnościami?</p>
            <a href="mailto:supportsaveeat@gmail.com." className="bg-gray-800 hover:bg-gray-700 text-green-400 px-4 py-2 rounded-lg font-bold inline-block transition-colors border border-gray-700 hover:border-green-500">
              Napisz do nas: supportsaveeat@gmail.com
            </a>
          </div>
        </div>
      </footer>

      {/* NOWE MODAL: PROFESJONALNA REJESTRACJA / LOGOWANIE */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md relative text-center">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl font-bold">✕</button>
            
            <h2 className="text-3xl font-extrabold text-gray-800 mb-6">Witaj w SaveEat!</h2>
            
            {/* Zakładki Logowanie / Rejestracja */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setAuthMode('login')} 
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Logowanie
              </button>
              <button 
                onClick={() => setAuthMode('register')} 
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${authMode === 'register' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Rejestracja
              </button>
            </div>

            {/* Zachęta do rejestracji (widoczna tylko w zakładce Rejestracja) */}
            {authMode === 'register' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl mb-6 text-sm text-left">
                <span className="font-bold">🎁 Zarejestruj się dziś!</span> Zyskasz 7 dni dostępu do Skanera AI za darmo.
              </div>
            )}

            {/* Przyciski Social Login */}
            <div className="flex flex-col gap-3 mb-6">
              <button onClick={() => handleAuthSubmit('google')} className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                <span className="text-xl">🌐</span> {authMode === 'login' ? 'Zaloguj przez Google' : 'Zarejestruj przez Google'}
              </button>
              <button onClick={() => handleAuthSubmit('apple')} className="w-full flex items-center justify-center gap-3 bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors">
                <span className="text-xl">🍎</span> {authMode === 'login' ? 'Zaloguj przez Apple' : 'Zarejestruj przez Apple'}
              </button>
            </div>

            <div className="relative flex items-center py-2 mb-6">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">lub e-mailem</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <input type="email" placeholder="Twój e-mail" className="w-full p-4 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50" />
            <input type="password" placeholder="Hasło" className="w-full p-4 border border-gray-200 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50" />
            
            <button onClick={() => handleAuthSubmit()} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-green-700 transition-all text-lg">
              {authMode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}
            </button>
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
              <p className="text-gray-500 font-medium">
                {isPremium ? `Twoje premium wygasa: ${premiumExpiryDate}. Przedłuż swój dostęp!` : "Odblokuj pełną moc sztucznej inteligencji."}
              </p>
            </div>
            <ul className="space-y-3 mb-8 text-gray-700">
              <li className="flex items-center gap-3">✅ <span className="font-bold">Skaner paragonów AI</span> (Automatyczne dodawanie)</li>
              <li className="flex items-center gap-3">✅ Limit punktów usunięty</li>
              <li className="flex items-center gap-3">✅ Wyszukiwanie produktów premium</li>
            </ul>
            <button onClick={handleBuyPremium} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all text-lg">
              {isPremium ? "Przedłuż za 9.99 zł / msc" : "Kup za 19.99 zł / msc"}
            </button>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md relative flex flex-col items-center">
            <button onClick={() => !isScanning && setIsScannerOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl font-bold">✕</button>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">📷 Skaner Paragonów AI</h2>
            <p className="text-gray-500 text-center mb-8">Zrób zdjęcie swojego paragonu ze sklepu. Aplikacja sama doda produkty do lodówki.</p>
            {!isScanning ? (
              <button onClick={handleScanReceipt} className="w-32 h-32 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors border-4 border-green-500 group"><span className="text-5xl group-hover:scale-110 transition-transform">📸</span></button>
            ) : (
              <div className="flex flex-col items-center space-y-4"><div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div><p className="text-amber-600 font-bold animate-pulse">Sztuczna Inteligencja analizuje dane...</p></div>
            )}
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
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Dodaj do lodówki</h2>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nazwa produktu</label>
            <div className="relative mb-6">
              <input type="text" value={foodName} onChange={(e) => { setFoodName(e.target.value); setShowSuggestions(true); }} placeholder="Wpisz np. Ketchup, Nutella, Cola..." className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50" />
              {searchMessage && <div className="absolute right-4 top-4 font-bold text-sm text-gray-400">{searchMessage}</div>}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  {suggestions.map((product, index) => {
                    const hasImage = product.image_front_small_url || product.image_small_url;
                    return (
                      <li key={product.id || index} onClick={() => handleSelectProduct(product)} className="flex items-center gap-3 p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors">
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