import React, { useState, useEffect } from "react";

const App = () => {
  // ⚡ URL से Company ID निकालना (जैसे nexkhata.vercel.app/1 से '1' निकलेगा)
  const pathParts = window.location.pathname.split("/");
  const urlCompanyId = pathParts[pathParts.length - 1] || 1;

  const [catalog, setCatalog] = useState([]);
  const [companyName, setCompanyName] = useState("Loading...");
  const [catalogDate, setCatalogDate] = useState("");
  const [companyWhatsapp, setCompanyWhatsapp] = useState("");
  const [isLicensed, setIsLicensed] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // ⚡ Filters & Scroll State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(20); // Infinite Scroll Count
  const [cart, setCart] = useState({});

  useEffect(() => {
    // ☁️ RENDER CLOUD API HIT (Localhost Hata Diya Gaya Hai)
    fetch(
      `https://nexkhata-cloud-sync.onrender.com/api/public/catalog/${urlCompanyId}`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.isLicensed === false) {
            setIsLicensed(false);
            setIsLoading(false);
            return;
          }
          setCatalog(data.data);
          setCompanyName(data.companyName);
          setCatalogDate(data.catalogDate);
          setCompanyWhatsapp(data.whatsappNumber);
        } else {
          setCompanyName("Catalog Not Found");
        }
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setCompanyName("Server Error");
        setIsLoading(false);
      });
  }, [urlCompanyId]);

  // ⚡ Infinite Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 100 >=
        document.documentElement.offsetHeight
      ) {
        setVisibleCount((prev) => prev + 20);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset visible count when search or category changes
  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, selectedCategory]);

  const handleUpdateCart = (item, change) => {
    setCart((prev) => {
      const currentQty = prev[item.item_id]?.qty || 0;
      const newQty = currentQty + change;
      const newCart = { ...prev };

      if (newQty <= 0) {
        delete newCart[item.item_id];
      } else {
        if (newQty > item.current_stock) {
          alert(`Only ${item.current_stock} ${item.unit} available in stock!`);
          return prev;
        }
        newCart[item.item_id] = { ...item, qty: newQty };
      }
      return newCart;
    });
  };

  const handleSendOrder = () => {
    if (!companyWhatsapp || companyWhatsapp.length < 10) {
      alert("Company WhatsApp number is not configured by the owner!");
      return;
    }

    const cartItems = Object.values(cart);
    if (cartItems.length === 0) return;

    let totalAmount = 0;
    let message = `*🌟 New Order from Catalog 🌟*\n`;
    message += `*Company:* ${companyName}\n`;
    message += `-----------------------------------\n`;

    cartItems.forEach((item, index) => {
      const itemTotal = (item.selling_price || 0) * item.qty;
      totalAmount += itemTotal;
      message += `${index + 1}. *${item.item_name}*\n`;
      message += `   ${item.qty} ${item.unit} x ₹${item.selling_price} = *₹${itemTotal}*\n`;
    });

    message += `-----------------------------------\n`;
    message += `*🧾 Total Amount: ₹${totalAmount.toLocaleString("en-IN")}*\n\n`;
    message += `Please process this order. Thank you!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/91${companyWhatsapp.replace(/\D/g, "").slice(-10)}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
  };

  // 📂 Extract Unique Categories
  const categories = [
    "All",
    ...new Set(
      catalog.map(
        (item) => item.item_category || item.item_group || "Uncategorized",
      ),
    ),
  ];

  // Filter Data
  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.item_code &&
        item.item_code.toLowerCase().includes(searchQuery.toLowerCase()));

    const cat = item.item_category || item.item_group || "Uncategorized";
    const matchesCategory =
      selectedCategory === "All" || cat === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Apply Lazy Loading
  const displayedItems = filteredCatalog.slice(0, visibleCount);

  const cartArray = Object.values(cart);
  const totalCartItems = cartArray.reduce((sum, item) => sum + item.qty, 0);
  const totalCartValue = cartArray.reduce(
    (sum, item) => sum + item.qty * (item.selling_price || 0),
    0,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin text-4xl text-indigo-600 mb-4">📦</div>
        <p className="font-black text-slate-500 uppercase tracking-widest text-xs">
          Loading Live Stock...
        </p>
      </div>
    );
  }

  if (!isLicensed) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-4">🔒</span>
        <h2 className="font-black text-rose-700 text-2xl uppercase tracking-widest">
          Catalog Locked
        </h2>
        <p className="text-rose-500 font-bold text-sm mt-3">
          This company's catalog subscription has expired or is inactive.
        </p>
      </div>
    );
  }

  if (companyName === "Catalog Not Found" || companyName === "Server Error") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <span className="text-5xl mb-4">⚠️</span>
        <h2 className="font-black text-slate-600 text-xl uppercase tracking-widest">
          Catalog Unavailable
        </h2>
        <p className="text-slate-500 text-sm mt-2">
          Please ask the store owner to sync their catalog.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-28">
      {/* 🌟 HEADER, SEARCH & FILTERS (Sticky) */}
      <div className="sticky top-0 z-40 flex flex-col shadow-md">
        <div className="bg-indigo-600 text-white px-6 pt-5 pb-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-lg shrink-0">
                🏢
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-black uppercase tracking-wider leading-tight">
                  {companyName}
                </h1>
                <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest">
                  Live B2B Inventory
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/95 backdrop-blur-md px-4 py-3 border-b border-slate-200">
          <div className="max-w-3xl mx-auto flex flex-col space-y-3">
            {/* Search & Category Row */}
            <div className="flex space-x-2">
              <div className="relative shadow-sm flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search items..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-700 text-sm bg-white shadow-inner"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none font-bold text-slate-700 text-xs shadow-sm max-w-[140px] shrink-0"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Stats Row */}
            <div className="flex justify-between items-center px-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {filteredCatalog.length} Items Match
              </p>
              <p className="text-[8px] font-bold text-slate-400">
                Updated:{" "}
                {catalogDate
                  ? new Date(catalogDate).toLocaleString("en-IN", {
                      timeStyle: "short",
                      dateStyle: "short",
                    })
                  : "Just now"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 📦 ITEM GRID (Lazy Loaded) */}
      <div className="max-w-3xl mx-auto px-4 mt-4">
        {displayedItems.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center mt-4 shadow-sm">
            <span className="text-4xl opacity-50 mb-3 block">📭</span>
            <h3 className="font-black text-slate-600 text-sm uppercase tracking-widest">
              No Items Found
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayedItems.map((item) => (
              <div
                key={item.item_id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-slate-800 text-sm leading-tight pr-2">
                      {item.item_name}
                    </h3>
                  </div>
                  <div className="flex items-center text-[10px] font-bold text-slate-400 mb-3 space-x-3">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      📂{" "}
                      {item.item_category || item.item_group || "Uncategorized"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-slate-100 pt-3 mt-1">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      Price
                    </p>
                    <p className="text-lg font-black text-indigo-700">
                      ₹
                      {parseFloat(item.selling_price || 0).toLocaleString(
                        "en-IN",
                      )}
                    </p>
                  </div>

                  {/* 🟢 Live Qty + 🛒 Cart Controls */}
                  <div className="flex flex-col items-end space-y-2">
                    <p className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      {item.current_stock} {item.unit} Avail.
                    </p>

                    {cart[item.item_id] ? (
                      <div className="flex items-center bg-indigo-50 rounded-lg p-1 border border-indigo-100 shadow-inner">
                        <button
                          onClick={() => handleUpdateCart(item, -1)}
                          className="w-7 h-7 bg-white text-indigo-600 rounded shadow-sm font-black text-lg flex items-center justify-center hover:bg-slate-50"
                        >
                          -
                        </button>
                        <span className="text-xs font-black w-8 text-center text-indigo-900">
                          {cart[item.item_id].qty}
                        </span>
                        <button
                          onClick={() => handleUpdateCart(item, 1)}
                          className="w-7 h-7 bg-indigo-600 text-white rounded shadow-sm font-black text-lg flex items-center justify-center hover:bg-indigo-700"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpdateCart(item, 1)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center space-x-1"
                      >
                        <span>Add</span>{" "}
                        <span className="text-sm leading-none">+</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading Spinner at bottom if more items exist */}
        {visibleCount < filteredCatalog.length && (
          <div className="text-center mt-6 animate-pulse text-2xl">⏳</div>
        )}
      </div>

      {/* 🚀 BOTTOM FLOATING CART BAR */}
      {cartArray.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] z-50 animate-slide-up">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {totalCartItems} Items Selected
              </p>
              <p className="text-xl font-black text-slate-800">
                ₹{totalCartValue.toLocaleString("en-IN")}
              </p>
            </div>
            <button
              onClick={handleSendOrder}
              className="bg-[#25D366] hover:bg-[#1DA851] text-white px-5 py-3 rounded-xl font-black shadow-lg flex items-center space-x-2 transition-transform active:scale-95"
            >
              <span>Order on WhatsApp</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
