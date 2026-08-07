
window.DEFAULT_CAFE_DATA = {
  cafeInfo: {
    name: "Brew Butterfly Cafe",
    tagline: "Coffee, Momo & Hookah Lounge",
    location: "Tejbinayak, Baimal Marga, Kathmandu",
    phone: "974-4569611",
    hours: "Daily, 8:00 AM – 8:00 PM",
    rating: 4.0,
    reviewCount: 16,
    priceRange: "Rs 500 – 2,500 per person",
    heroBg: "assets/cafe-bg.jpg",
    aboutBg: "assets/cafe-lounge.jpeg"
  },

  categories: [
    { id: "breakfast", name: "Breakfast", icon: "ic-egg" },
    { id: "burger", name: "Burger", icon: "ic-burger" },
    { id: "chowmein", name: "Chowmein", icon: "ic-noodle" },
    { id: "cigarettes", name: "Cigarettes", icon: "ic-cig" },
    { id: "cold-drinks", name: "Cold Drinks", icon: "ic-cup-cold" },
    { id: "energy", name: "Energy Drink", icon: "ic-bolt" },
    { id: "hookah", name: "Hookah", icon: "ic-hookah" },
    { id: "lassi", name: "Lassi", icon: "ic-lassi" },
    { id: "momo", name: "Momo", icon: "ic-momo" },
    { id: "snacks", name: "Snacks", icon: "ic-snack" },
    { id: "special", name: "Special Menu", icon: "ic-star" },
    { id: "tea-coffee", name: "Tea & Coffee", icon: "ic-cup-hot" }
  ],

  menuItems: [
    /* ===================== BREAKFAST ===================== */
    {
      id: "bk-boiled-egg",
      cat: "breakfast",
      name: "Boiled Egg",
      price: 40,
      desc: "Perfectly boiled eggs served with a sprinkle of black pepper and salt.",
      photo: "assets/food/boiled-egg.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "bk-chana",
      cat: "breakfast",
      name: "Chana",
      price: 50,
      desc: "Flavourful spiced chickpea bowl, a hearty and healthy start to the day.",
      photo: "assets/food/chana-tarkari.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "bk-plain-omlette",
      cat: "breakfast",
      name: "Plain Omlette",
      price: 50,
      desc: "Soft, fluffy three-egg omelette cooked with butter, salt and pepper.",
      photo: "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=600&q=80",
      veg: false,
      featured: false,
      inStock: true
    },

    /* ===================== BURGER ===================== */
    {
      id: "bg-chicken-burger",
      cat: "burger",
      name: "Chicken Burger",
      price: 150,
      desc: "Juicy chicken patty in a sesame bun with house mayonnaise and fresh lettuce.",
      photo: "assets/gourmet-burger.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "bg-double-chicken-burger",
      cat: "burger",
      name: "Double Chicken Burger",
      price: 200,
      desc: "Twin chicken patties, melted cheese, lettuce, tomato and our signature sauce.",
      photo: "assets/food/burger-double.jpg",
      veg: false,
      featured: true,
      inStock: true
    },

    /* ===================== CHOWMEIN ===================== */
    {
      id: "cm-buff",
      cat: "chowmein",
      name: "Buff Chowmein",
      price: 160,
      desc: "Wok-tossed noodles with spiced buff chunks, cabbage and dark soy sauce.",
      photo: "assets/food/chowmein-buff.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "cm-chicken",
      cat: "chowmein",
      name: "Chicken Chowmein",
      price: 180,
      desc: "Stir-fried noodles with tender chicken strips and garden vegetables.",
      photo: "assets/food/chowmein-chicken.jpg",
      veg: false,
      featured: true,
      inStock: true
    },
    {
      id: "cm-veg",
      cat: "chowmein",
      name: "Veg Chowmein",
      price: 130,
      desc: "Fresh vegetable noodles tossed on high heat with a smoky soy finish.",
      photo: "assets/food/chowmein-veg.jpg",
      veg: true,
      featured: false,
      inStock: true
    },

    /* ===================== CIGARETTES ===================== */
    {
      id: "cig-24-carat-surya",
      cat: "cigarettes",
      name: "24 Carat Surya",
      price: 30,
      desc: "Classic Surya in the premium 24 Carat pack.",
      photo: "assets/food/cigarettes-pack-1.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "cig-fusion",
      cat: "cigarettes",
      name: "Fusion",
      price: 30,
      desc: "Smooth and mellow Surya Fusion stick.",
      photo: "assets/food/cigarettes-pack-2.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "cig-shikhar-ice",
      cat: "cigarettes",
      name: "Shikhar Ice",
      price: 30,
      desc: "Fresh menthol blast with a crisp Shikhar Ice finish.",
      photo: "assets/food/cigarettes-pack-1.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "cig-surya-light",
      cat: "cigarettes",
      name: "Surya Light",
      price: 30,
      desc: "Light blend Surya with a softer, smoother draw.",
      photo: "assets/food/cigarettes-pack-2.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "cig-surya-red",
      cat: "cigarettes",
      name: "Surya Red",
      price: 35,
      desc: "Full-flavoured Surya Red for a richer smoke.",
      photo: "assets/food/cigarettes-pack-1.jpg",
      veg: false,
      featured: false,
      inStock: true
    },

    /* ===================== COLD DRINKS ===================== */
    {
      id: "cd-coke",
      cat: "cold-drinks",
      name: "Coke",
      price: 70,
      desc: "Ice-cold classic Coca-Cola served with a chilled glass.",
      photo: "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=600&q=80",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "cd-cold-coffee",
      cat: "cold-drinks",
      name: "Cold Coffee",
      price: 150,
      desc: "Creamy blended iced coffee, topped with a frothy finish.",
      photo: "assets/food/cold-coffee.jpg",
      veg: true,
      featured: true,
      inStock: true
    },
    {
      id: "cd-fanta",
      cat: "cold-drinks",
      name: "Fanta",
      price: 70,
      desc: "Zesty, fizzy orange Fanta served ice cold.",
      photo: "assets/food/fanta-orange.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "cd-peach-iced",
      cat: "cold-drinks",
      name: "Peach Iced",
      price: 150,
      desc: "Refreshing peach iced tea over a tall glass of ice.",
      photo: "assets/food/peach-iced.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "cd-sprite",
      cat: "cold-drinks",
      name: "Sprite",
      price: 70,
      desc: "Crisp, lemon-lime Sprite served with plenty of ice.",
      photo: "assets/food/sprite.jpg",
      veg: true,
      featured: false,
      inStock: true
    },

    /* ===================== ENERGY DRINK ===================== */
    {
      id: "en-redbull-220",
      cat: "energy",
      name: "Red Bull 220ml",
      price: 130,
      desc: "Original Red Bull Energy Drink, 220ml can.",
      photo: "assets/food/redbull-can.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "en-redbull-330",
      cat: "energy",
      name: "Red Bull 330ml",
      price: 150,
      desc: "Bigger 330ml can of original Red Bull for a longer lift.",
      photo: "assets/food/redbull-cans.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "en-xtreme",
      cat: "energy",
      name: "Xtreme",
      price: 145,
      desc: "High-voltage Xtreme energy drink, 250ml.",
      photo: "assets/food/xtreme-energy.jpg",
      veg: true,
      featured: false,
      inStock: true
    },

    /* ===================== HOOKAH ===================== */
    {
      id: "hk-cloud-coil",
      cat: "hookah",
      name: "Cloud Coil",
      price: 70,
      desc: "Quick cloud session with a smooth, clean pull.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-cloud-double-apple",
      cat: "hookah",
      name: "Cloud Double Apple",
      price: 400,
      desc: "Classic sweet anise double apple with thick cloud output.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-cloud-icy-mango",
      cat: "hookah",
      name: "Cloud Icy Mango",
      price: 500,
      desc: "Chilled mango shisha with heavy clouds and a menthol finish.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: true,
      inStock: true
    },
    {
      id: "hk-cloud-lady-killer",
      cat: "hookah",
      name: "Cloud Lady Killer",
      price: 500,
      desc: "Bold fruity blend with an intense, flavour-packed cloud.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-cloud-mango",
      cat: "hookah",
      name: "Cloud Mango",
      price: 400,
      desc: "Sweet ripe mango cloud hookah, rich and smooth.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-cloud-mint",
      cat: "hookah",
      name: "Cloud Mint",
      price: 400,
      desc: "Fresh cooling mint with a crisp, icy cloud.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-cloud-mix-favor",
      cat: "hookah",
      name: "Cloud Mix Favor",
      price: 500,
      desc: "Custom mixed-favour cloud session — ask our hookah master.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-cloud-strawberry",
      cat: "hookah",
      name: "Cloud Strawberry",
      price: 500,
      desc: "Juicy strawberry cloud hookah with a sweet aroma.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-double-apple-normal",
      cat: "hookah",
      name: "Double Apple (Normal)",
      price: 350,
      desc: "The timeless double apple blend on a regular setup.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-iced-pipe",
      cat: "hookah",
      name: "Iced Pipe",
      price: 75,
      desc: "Cool iced-pipe session for a refreshing smoke.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-icy-mango-normal",
      cat: "hookah",
      name: "Icy Mango (Normal)",
      price: 450,
      desc: "Menthol-chilled mango on a regular hookah setup.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-mango-normal",
      cat: "hookah",
      name: "Mango (Normal)",
      price: 350,
      desc: "Sweet mango flavour on a regular hookah setup.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-normal-coil",
      cat: "hookah",
      name: "Normal Coil",
      price: 30,
      desc: "Quick regular coil session, light and easy.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-normal-lady-killer",
      cat: "hookah",
      name: "Normal Lady Killer",
      price: 400,
      desc: "The infamous Lady Killer blend on a regular setup.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "hk-normal-mint",
      cat: "hookah",
      name: "Normal Mint",
      price: 350,
      desc: "Pure fresh mint on a regular hookah setup.",
      photo: "assets/cloud-hookah.jpg",
      veg: false,
      featured: false,
      inStock: true
    },

    /* ===================== LASSI ===================== */
    {
      id: "ls-banana",
      cat: "lassi",
      name: "Banana Lassi",
      price: 140,
      desc: "Rich thick curd blended with fresh banana and a touch of sweetness.",
      photo: "assets/special-lassi.jpg",
      veg: true,
      featured: true,
      inStock: true
    },
    {
      id: "ls-plain",
      cat: "lassi",
      name: "Plain Lassi",
      price: 110,
      desc: "Traditional creamy yoghurt lassi, lightly salted or sweet on request.",
      photo: "assets/food/lassi-plain.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "ls-sweet",
      cat: "lassi",
      name: "Sweet Lassi",
      price: 130,
      desc: "Chilled sweetened yoghurt drink finished with a malai topping.",
      photo: "assets/special-lassi.jpg",
      veg: true,
      featured: false,
      inStock: true
    },

    /* ===================== MOMO ===================== */
    {
      id: "mm-c-chicken",
      cat: "momo",
      name: "C Chicken Momo",
      price: 200,
      desc: "Chicken dumplings tossed in rich sweet-and-spicy chilli sauce with peppers.",
      photo: "assets/food/momo-chilli.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "mm-c-buff",
      cat: "momo",
      name: "C. Buff Momo",
      price: 180,
      desc: "Buff momo wok-tossed in a garlic chilli gravy.",
      photo: "assets/food/momo-chilli.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "mm-chicken-kurkure",
      cat: "momo",
      name: "Chicken Kurkure Momo",
      price: 240,
      desc: "Crunchy double-coated fried chicken dumplings with spicy tomato chutney.",
      photo: "assets/kurkure-momo.jpg",
      veg: false,
      featured: true,
      inStock: true
    },
    {
      id: "mm-buff-kurkure",
      cat: "momo",
      name: "Kurkure Buff Momo",
      price: 210,
      desc: "Crispy golden kurkure-coated buff momo, fried to perfection.",
      photo: "assets/kurkure-momo.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "mm-steam-chicken",
      cat: "momo",
      name: "Steam Chicken Momo",
      price: 180,
      desc: "Juicy minced chicken steamed in paper-thin dough with local herbs.",
      photo: "assets/food/momo-steam-chicken.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "mm-steam-buff",
      cat: "momo",
      name: "Steam Buff Momo",
      price: 160,
      desc: "Classic steamed buff momo packed with a traditional Nepali spice mix.",
      photo: "assets/food/momo-steam-buff.jpg",
      veg: false,
      featured: false,
      inStock: true
    },

    /* ===================== SNACKS ===================== */
    {
      id: "sn-buff-sausage",
      cat: "snacks",
      name: "Buff Sausage",
      price: 50,
      desc: "Grilled spiced buff sausage, served hot with a side of chutney.",
      photo: "assets/food/sausage-grill.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "sn-chau-chau-sadheko",
      cat: "snacks",
      name: "Chau Chau Sadheko",
      price: 85,
      desc: "Spicy wok-tossed noodles with onion, tomato and a fiery kick.",
      photo: "assets/food/noodles-sadheko.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "sn-chicken-lollipop",
      cat: "snacks",
      name: "Chicken Lollipop",
      price: 120,
      desc: "Crispy golden chicken lollipops tossed in a tangy chilli glaze.",
      photo: "assets/food/chicken-lollipop.jpg",
      veg: false,
      featured: true,
      inStock: true
    },
    {
      id: "sn-chicken-sausage",
      cat: "snacks",
      name: "Chicken Sausage",
      price: 60,
      desc: "Juicy grilled chicken sausage with house seasoning.",
      photo: "assets/food/sausage-grill.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "sn-peanut-sadheko",
      cat: "snacks",
      name: "Peanut Sadheko",
      price: 100,
      desc: "Spiced roasted peanuts tossed with onion, chilli and coriander.",
      photo: "assets/food/peanut-sadheko.jpg",
      veg: true,
      featured: false,
      inStock: true
    },

    /* ===================== SPECIAL MENU ===================== */
    {
      id: "sp-butterfly-pea-tea",
      cat: "special",
      name: "Butterfly Pea Tea",
      price: 180,
      desc: "Signature indigo-blue tea brewed from butterfly pea flowers. Add lemon to watch it turn violet.",
      photo: "assets/butterfly-pea-tea.jpg",
      veg: true,
      featured: true,
      inStock: true
    },
    {
      id: "sp-egg-burger",
      cat: "special",
      name: "Egg Burger",
      price: 80,
      desc: "Toasted bun with a fresh fried egg, cheese slice and house spices.",
      photo: "assets/food/egg-burger.jpg",
      veg: false,
      featured: true,
      inStock: true
    },

    /* ===================== TEA & COFFEE ===================== */
    {
      id: "tc-black-coffee",
      cat: "tea-coffee",
      name: "Black Coffee",
      price: 50,
      desc: "Dark roast brewed black — bold, clean and sugar-free.",
      photo: "assets/artisanal-coffee.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "tc-black-tea",
      cat: "tea-coffee",
      name: "Black Tea",
      price: 30,
      desc: "Strong classic black tea, served hot and refreshing.",
      photo: "assets/food/black-tea.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "tc-honey-ginger",
      cat: "tea-coffee",
      name: "Hot With Honey And Ginger",
      price: 100,
      desc: "Soothing ginger infusion sweetened with pure mountain honey.",
      photo: "assets/food/honey-ginger-tea.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "tc-hot-lemon",
      cat: "tea-coffee",
      name: "Hot Lemon",
      price: 40,
      desc: "Freshly squeezed lemon in hot water — simple and healthy.",
      photo: "assets/food/hot-lemon.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "tc-hot-lemon-honey",
      cat: "tea-coffee",
      name: "Hot Lemon With Honey",
      price: 80,
      desc: "Warm lemon water sweetened with organic wild honey.",
      photo: "assets/food/hot-lemon-honey.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "tc-lemon-tea",
      cat: "tea-coffee",
      name: "Lemon Tea",
      price: 40,
      desc: "Bright citrus tea with a fresh lemon squeeze.",
      photo: "assets/food/lemon-tea.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "tc-masala-tea",
      cat: "tea-coffee",
      name: "Masala Tea",
      price: 55,
      desc: "Rich milk tea infused with cardamom, ginger, cloves and cinnamon.",
      photo: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=600&q=80",
      veg: true,
      featured: true,
      inStock: true
    },
    {
      id: "tc-milk-coffee",
      cat: "tea-coffee",
      name: "Milk Coffee",
      price: 90,
      desc: "Creamy steamed-milk coffee brewed from freshly ground beans.",
      photo: "assets/artisanal-coffee.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "tc-milk-tea",
      cat: "tea-coffee",
      name: "Milk Tea",
      price: 40,
      desc: "Comforting sweet milk tea, a neighbourhood favourite.",
      photo: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=600&q=80",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "tc-peach-tea",
      cat: "tea-coffee",
      name: "Peach Tea",
      price: 70,
      desc: "Fragrant peach-flavoured tea served steaming hot.",
      photo: "assets/food/peach-tea.jpg",
      veg: true,
      featured: false,
      inStock: true
    }
  ],

  gallery: [
    {
      id: "g-1",
      title: "Dining & Lounge",
      src: "assets/cafe-bg.jpg",
      desc: "Warm ambient seating with string lights and cozy tables in Tejbinayak."
    },
    {
      id: "g-2",
      title: "Cafe Interior",
      src: "assets/cafe-lounge.jpeg",
      desc: "Cozy interior spot perfect for afternoon tea and evening hookah."
    },
    {
      id: "g-3",
      title: "Cafe Exterior",
      src: "assets/cafe-vibe.jpg",
      desc: "Brew Butterfly Cafe along Baimal Marga, Kathmandu."
    },
    {
      id: "g-4",
      title: "Signature Butterfly Pea Tea",
      src: "assets/butterfly-pea-tea.jpg",
      desc: "Steeped indigo blue tea blooming into deep purple."
    },
    {
      id: "g-5",
      title: "Crispy Kurkure Momo Platter",
      src: "assets/kurkure-momo.jpg",
      desc: "Golden crunchy dumplings served hot with homemade chutneys."
    },
    {
      id: "g-6",
      title: "Cloud Hookah Session",
      src: "assets/cloud-hookah.jpg",
      desc: "Smooth flavored cloud hookah setup for relaxing evenings."
    }
  ]
};
