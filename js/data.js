/* Brew Butterfly Cafe - Initial Seed Data & Configuration */
window.DEFAULT_CAFE_DATA = {
  cafeInfo: {
    name: "Brew Butterfly Cafe",
    tagline: "Coffee, Momo & Hookah Lounge",
    location: "Tejbinayak, Baimal Marga, Kathmandu",
    phone: "974-4569611",
    hours: "Daily, 11:00 AM – 8:00 PM",
    rating: 4.8,
    reviewCount: 42,
    priceRange: "Rs 500 – 2,500 per person",
    heroBg: "assets/cafe-bg.jpg",
    aboutBg: "assets/cafe-lounge.jpg"
  },
  categories: [
    { id: "special", name: "Special Menu", icon: "ic-star" },
    { id: "momo", name: "Momo", icon: "ic-momo" },
    { id: "chowmein", name: "Chowmein", icon: "ic-noodle" },
    { id: "burger", name: "Burger", icon: "ic-burger" },
    { id: "tea-coffee", name: "Tea & Coffee", icon: "ic-cup-hot" },
    { id: "cold-drinks", name: "Cold Drinks", icon: "ic-cup-cold" },
    { id: "hookah", name: "Hookah", icon: "ic-hookah" },
    { id: "lassi", name: "Lassi", icon: "ic-lassi" },
    { id: "breakfast", name: "Breakfast", icon: "ic-egg" },
    { id: "snacks", name: "Snacks", icon: "ic-snack" },
    { id: "energy", name: "Energy Drink", icon: "ic-bolt" },
    { id: "cigarettes", name: "Cigarettes", icon: "ic-cig" }
  ],
  menuItems: [
    // Special Menu
    {
      id: "m-101",
      cat: "special",
      name: "Butterfly Pea Tea",
      price: 180,
      desc: "Signature indigo-blue tea brewed from dried butterfly pea flowers. Squeeze lemon tableside to watch it turn deep violet.",
      photo: "assets/butterfly-pea-tea.jpg",
      veg: true,
      featured: true,
      inStock: true
    },
    {
      id: "m-102",
      cat: "special",
      name: "Egg Burger",
      price: 80,
      desc: "Toasted bun with fresh fried egg, cheese slice & house spices.",
      photo: "assets/gourmet-burger.jpg",
      veg: false,
      featured: true,
      inStock: true
    },

    // Momo
    {
      id: "m-201",
      cat: "momo",
      name: "Chicken Kurkure Momo",
      price: 240,
      desc: "Crunchy double-coated pan fried chicken dumplings served with spicy tomato sesame chutney.",
      photo: "assets/kurkure-momo.jpg",
      veg: false,
      featured: true,
      inStock: true
    },
    {
      id: "m-202",
      cat: "momo",
      name: "Steam Chicken Momo",
      price: 180,
      desc: "Juicy minced chicken steamed in paper-thin dough with local herbs.",
      photo: "assets/kurkure-momo.jpg",
      veg: false,
      featured: true,
      inStock: true
    },
    {
      id: "m-203",
      cat: "momo",
      name: "C. Chicken Momo",
      price: 200,
      desc: "Chicken dumplings tossed in rich sweet-and-spicy chilli sauce with bell peppers.",
      photo: "assets/kurkure-momo.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "m-204",
      cat: "momo",
      name: "Steam Buff Momo",
      price: 160,
      desc: "Classic steamed buff momo packed with rich Nepalese spice mix.",
      photo: "assets/kurkure-momo.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "m-205",
      cat: "momo",
      name: "Kurkure Buff Momo",
      price: 210,
      desc: "Crispy coated buff momo fried to golden perfection.",
      photo: "assets/kurkure-momo.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "m-206",
      cat: "momo",
      name: "C. Buff Momo",
      price: 180,
      desc: "Chilli buff momo wok-tossed in garlic chilli gravy.",
      photo: "assets/kurkure-momo.jpg",
      veg: false,
      featured: false,
      inStock: true
    },

    // Chowmein
    {
      id: "m-301",
      cat: "chowmein",
      name: "Chicken Chowmein",
      price: 180,
      desc: "Wok-tossed noodles with chicken strips, cabbage, carrots & dark soy sauce.",
      photo: "assets/spiced-chowmein.jpg",
      veg: false,
      featured: true,
      inStock: true
    },
    {
      id: "m-302",
      cat: "chowmein",
      name: "Buff Chowmein",
      price: 160,
      desc: "Spicy stir-fried noodles cooked with spiced buff chunks.",
      photo: "assets/spiced-chowmein.jpg",
      veg: false,
      featured: false,
      inStock: true
    },
    {
      id: "m-303",
      cat: "chowmein",
      name: "Veg Chowmein",
      price: 130,
      desc: "Fresh garden vegetable noodles tossed on high heat.",
      photo: "assets/spiced-chowmein.jpg",
      veg: true,
      featured: false,
      inStock: true
    },

    // Burger
    {
      id: "m-401",
      cat: "burger",
      name: "Double Chicken Burger",
      price: 200,
      desc: "Double chicken patty, melted cheese, lettuce, tomato & signature sauce.",
      photo: "assets/gourmet-burger.jpg",
      veg: false,
      featured: true,
      inStock: true
    },
    {
      id: "m-402",
      cat: "burger",
      name: "Chicken Burger",
      price: 150,
      desc: "Juicy chicken patty in sesame bun with house mayonnaise.",
      photo: "assets/gourmet-burger.jpg",
      veg: false,
      featured: false,
      inStock: true
    },

    // Tea & Coffee
    {
      id: "m-501",
      cat: "tea-coffee",
      name: "Masala Tea",
      price: 55,
      desc: "Rich milk tea infused with cardamom, ginger, cloves and cinnamon.",
      photo: "assets/butterfly-pea-tea.jpg",
      veg: true,
      featured: true,
      inStock: true
    },
    {
      id: "m-502",
      cat: "tea-coffee",
      name: "Milk Coffee",
      price: 90,
      desc: "Creamy steamed milk coffee brewed from freshly ground beans.",
      photo: "assets/artisanal-coffee.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "m-503",
      cat: "tea-coffee",
      name: "Black Coffee",
      price: 50,
      desc: "Dark roast espresso diluted with hot water for robust flavor.",
      photo: "assets/artisanal-coffee.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "m-504",
      cat: "tea-coffee",
      name: "Hot Lemon With Honey",
      price: 80,
      desc: "Squeezed lemon juice with pure organic wild honey.",
      photo: "assets/butterfly-pea-tea.jpg",
      veg: true,
      featured: false,
      inStock: true
    },
    {
      id: "m-505",
      cat: "tea-coffee",
      name: "Hot With Honey And Ginger",
      price: 100,
      desc: "Soothing ginger extraction with mountain honey.",
      photo: "assets/butterfly-pea-tea.jpg",
      veg: true,
      featured: false,
      inStock: true
    },

    // Hookah
    {
      id: "m-601",
      cat: "hookah",
      name: "Cloud Icy Mango",
      price: 500,
      desc: "Chilled mango shisha with heavy cloud output and menthol finish.",
      photo: "assets/cloud-hookah.jpg",
      veg: true,
      featured: true,
      inStock: true
    },
    {
      id: "m-602",
      cat: "hookah",
      name: "Cloud Double Apple",
      price: 400,
      desc: "Classic sweet and anise double apple hookah.",
      photo: "assets/cloud-hookah.jpg",
      veg: true,
      featured: true,
      inStock: true
    },

    // Lassi
    {
      id: "m-701",
      cat: "lassi",
      name: "Banana Lassi",
      price: 140,
      desc: "Rich thick curd blended with fresh bananas and sweet syrup.",
      photo: "assets/special-lassi.jpg",
      veg: true,
      featured: true,
      inStock: true
    },
    {
      id: "m-702",
      cat: "lassi",
      name: "Sweet Lassi",
      price: 130,
      desc: "Chilled sweetened yogurt drink topped with malai.",
      photo: "assets/special-lassi.jpg",
      veg: true,
      featured: false,
      inStock: true
    },

    // Snacks
    {
      id: "m-801",
      cat: "snacks",
      name: "Crispy Fries",
      price: 120,
      desc: "Golden crispy seasoned potato fries with tomato ketchup.",
      photo: "assets/crispy-fries.jpg",
      veg: true,
      featured: true,
      inStock: true
    }
  ],
  gallery: [
    {
      id: "g-1",
      title: "Brew Butterfly Cafe Dining & Lounge",
      src: "assets/cafe-bg.jpg",
      desc: "Warm ambient seating with string lights and cozy tables in Tejbinayak."
    },
    {
      id: "g-2",
      title: "Lounge Atmosphere & String Lights",
      src: "assets/cafe-lounge.jpg",
      desc: "Cozy interior spot perfect for afternoon tea and evening hookah."
    },
    {
      id: "g-3",
      title: "Brew Butterfly Ambience",
      src: "assets/cafe-vibe.jpg",
      desc: "Relaxing environment along Baimal Marga, Kathmandu."
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
  ],
  sampleReservations: [
    {
      id: "BBC-948201",
      name: "Rohan Shrestha",
      phone: "9841234567",
      guests: 4,
      date: "2026-08-05",
      time: "6:00 PM",
      occasion: "Friends hangout",
      notes: "Window seat, 1 Icy Mango Hookah",
      status: "Confirmed",
      created: "2026-08-03"
    },
    {
      id: "BBC-883192",
      name: "Anjali Thapa",
      phone: "9808765432",
      guests: 2,
      date: "2026-08-04",
      time: "2:00 PM",
      occasion: "Birthday",
      notes: "Please arrange Butterfly Pea Tea on arrival",
      status: "Pending",
      created: "2026-08-03"
    }
  ]
};

