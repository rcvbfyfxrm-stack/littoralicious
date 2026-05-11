/* Terroir — Faro — manually built (legacy guide retrofit, May 2026)
 * NOTE: Several venue coords are approximate (geocoded to neighborhood).
 *       Phones omitted; verify before publishing widely.
 */
window.PCV_DATA = (function () {
    const COLORS = { berth:'#c4a35a', market:'#d97706', shop:'#059669', mainland:'#7c3aed', logistics:'#2d4a5e', bougie:'#8a6a2e' };
    const CAT_LABELS = { berth:'Signature', market:'Market / Direct', shop:'Restaurant / Bar', mainland:'Out of town', logistics:'Logistics', bougie:'Prestige' };
    const PRODUCT_COLORS = {
        'Michelin':'#7f1d1d','Contemporary':'#1f2937','Traditional':'#a16207',
        'Cult':'#7c3aed','Cafe':'#92400e','Wine':'#7c2d12','Bacaro':'#7c3aed',
        'Drink':'#0ea5e9','Street Food':'#dc2626','Market':'#d97706',
        'Produce':'#15803d','Fish':'#3b82f6','Meat':'#b91c1c'
    };
    const VENUES = [
  {
    "id": "v01-alameda",
    "cat": "shop",
    "tier": "berth_top",
    "priority": 1,
    "badge": "MICHELIN",
    "name": "Alameda",
    "short": "Alameda",
    "lat": 37.0182,
    "lng": -7.9344,
    "neighborhood": "Faro Centro",
    "address": "Rua Comendador Bívar 41-43, Faro Centro",
    "phone": "",
    "hours": "Dinner",
    "why": "Faro's first Michelin star (2026). Chef Rui Sequeira. Three tasting menus — Origami (12 courses), Umami (8 courses), Vegetal. Modern Algarve cooking that finally treats the city seriously. Algarve wine pairings recommended.",
    "tags": [
      "1 Michelin Star 2026",
      "EUR 90-115 tasting",
      "Essential",
      "Dinner"
    ],
    "productTags": [
      "Michelin"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Restaurante+Alameda+Faro"
  },
  {
    "id": "v02-checkin",
    "cat": "shop",
    "tier": "berth_top",
    "priority": 2,
    "badge": "MICHELIN",
    "name": "CHECKin by Leonel Pereira",
    "short": "CHECKin",
    "lat": 37.0146,
    "lng": -7.9354,
    "neighborhood": "Cidade Velha",
    "address": "Cidade Velha, Faro",
    "phone": "",
    "hours": "Dinner",
    "why": "Leonel Pereira gave up his Michelin star voluntarily. Converted grain-and-wine storehouse, fine dining quality at honest prices. The wine list is one of the best in Faro — niche Portuguese producers few know about. Sections: Check-in, Cozinhados no Tacho, Momentos Especiais, Check-out.",
    "tags": [
      "Michelin Recommended",
      "EUR 60-90",
      "Recommended",
      "Dinner"
    ],
    "productTags": [
      "Contemporary"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=CHECKin+Leonel+Pereira+Faro"
  },
  {
    "id": "v03-estamine",
    "cat": "mainland",
    "tier": "berth_top",
    "priority": 3,
    "badge": "CULT",
    "name": "Estamine — Ilha Deserta",
    "short": "Estamine",
    "lat": 36.9667,
    "lng": -7.91,
    "neighborhood": "Ilha Deserta (boat from Faro)",
    "address": "Ilha da Barreta (Ilha Deserta), boat from Faro marina",
    "phone": "",
    "hours": "Lunch only",
    "why": "Restaurant on an uninhabited barrier island. Boat from Faro marina. Eco-built, solar-powered. Menu is what the Ria and Atlantic deliver: oysters pulled that morning, grilled fish, arroz de lingueirão. The most singular dining experience in the Algarve.",
    "tags": [
      "Cult",
      "EUR 25-40",
      "Recommended",
      "Lunch"
    ],
    "productTags": [
      "Cult"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Restaurante+Estamine+Ilha+Deserta"
  },
  {
    "id": "v04-tasca-do-ricky",
    "cat": "shop",
    "tier": "several",
    "priority": 4,
    "badge": "TRADITIO",
    "name": "Tasca do Ricky",
    "short": "Tasca do Ricky",
    "lat": 37.0156,
    "lng": -7.9356,
    "neighborhood": "Faro Centro",
    "address": "Faro Centro",
    "phone": "",
    "hours": "Lunch / Dinner",
    "why": "Where Faro eats well without thinking about it. Cataplana, cod açorda (bread-and-cod stew with garlic and egg), rice dishes. The kind of place where the waiter knows what you should order better than you do.",
    "tags": [
      "Local Institution",
      "EUR 15-30",
      "Walk-in",
      "Lunch"
    ],
    "productTags": [
      "Traditional"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Tasca+do+Ricky+Faro"
  },
  {
    "id": "v05-restaurante-cidade-velha",
    "cat": "shop",
    "tier": "several",
    "priority": 5,
    "badge": "TRADITIO",
    "name": "Restaurante Cidade Velha",
    "short": "Cidade Velha",
    "lat": 37.0143,
    "lng": -7.9359,
    "neighborhood": "Cidade Velha (au pied de la Cathédrale)",
    "address": "Cidade Velha, foot of the Cathedral",
    "phone": "",
    "hours": "Dinner",
    "why": "Inside the old walls, terrace dining under bitter-orange trees. Traditional Algarve cuisine done with care — cataplana, fried octopus, seafood rice. Setting raises everything by half a star.",
    "tags": [
      "Local Favourite",
      "EUR 25-40",
      "Recommended weekends",
      "Dinner"
    ],
    "productTags": [
      "Traditional"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Restaurante+Cidade+Velha+Faro"
  },
  {
    "id": "v06-vila-adentro",
    "cat": "shop",
    "tier": "several",
    "priority": 6,
    "badge": "TRADITIO",
    "name": "Vila Adentro",
    "short": "Vila Adentro",
    "lat": 37.0149,
    "lng": -7.9358,
    "neighborhood": "Cidade Velha",
    "address": "Cidade Velha, Faro",
    "phone": "",
    "hours": "Dinner",
    "why": "18th-century building inside the walls. One of the rare Algarve places that does a proper vegetarian cataplana — proof the copper pot works without shellfish too.",
    "tags": [
      "Local Favourite",
      "EUR 20-35",
      "Recommended",
      "Dinner"
    ],
    "productTags": [
      "Traditional"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Vila+Adentro+Faro"
  },
  {
    "id": "v07-tertulia-algarvia",
    "cat": "shop",
    "tier": "several",
    "priority": 7,
    "badge": "TRADITIO",
    "name": "Tertúlia Algarvia",
    "short": "Tertúlia Algarvia",
    "lat": 37.0156,
    "lng": -7.9352,
    "neighborhood": "Faro Centro",
    "address": "Praça Afonso III 13, Faro Centro",
    "phone": "",
    "hours": "Lunch / Dinner",
    "why": "Traditional dishes made with regional products. Also runs cooking classes — useful for understanding cataplana technique. Seasonal menu tied to what land and sea give that week.",
    "tags": [
      "Local Favourite",
      "EUR 15-30",
      "Walk-in",
      "Lunch"
    ],
    "productTags": [
      "Traditional"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Tertulia+Algarvia+Faro"
  },
  {
    "id": "v08-o-recife",
    "cat": "shop",
    "tier": "several",
    "priority": 8,
    "badge": "TRADITIO",
    "name": "O Recife",
    "short": "O Recife",
    "lat": 37.0166,
    "lng": -7.9348,
    "neighborhood": "Faro (centre)",
    "address": "Faro",
    "phone": "",
    "hours": "Lunch / Dinner",
    "why": "Smoky piri-piri chicken grilled over charcoal. Grilled fish from the day's catch. Portuguese comfort food at its most direct — no decoration, all substance.",
    "tags": [
      "Local Favourite",
      "EUR 12-25",
      "Walk-in",
      "Lunch"
    ],
    "productTags": [
      "Traditional"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=O+Recife+Faro"
  },
  {
    "id": "v09-a-do-pinto",
    "cat": "shop",
    "tier": "several",
    "priority": 9,
    "badge": "TRADITIO",
    "name": "A Do Pinto",
    "short": "A Do Pinto",
    "lat": 37.0178,
    "lng": -7.9337,
    "neighborhood": "Faro (centre)",
    "address": "Faro",
    "phone": "",
    "hours": "Lunch / Dinner",
    "why": "Family-run, honest portions. Classic Algarvian cataplana with shrimp and clams, grilled fish.",
    "tags": [
      "Local Favourite",
      "EUR 15-30",
      "Walk-in",
      "Lunch"
    ],
    "productTags": [
      "Traditional"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=A+Do+Pinto+Faro"
  },
  {
    "id": "v10-o-chavalar",
    "cat": "shop",
    "tier": "several",
    "priority": 10,
    "badge": "TRADITIO",
    "name": "O Chavalar",
    "short": "O Chavalar",
    "lat": 37.018,
    "lng": -7.932,
    "neighborhood": "Faro",
    "address": "Faro",
    "phone": "",
    "hours": "Lunch",
    "why": "Fish restaurant, very local. Handwritten menu changes daily depending on the catch. Good value, not for tourists — which is the point.",
    "tags": [
      "Word of Mouth",
      "EUR 12-25",
      "Walk-in",
      "Lunch"
    ],
    "productTags": [
      "Traditional"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=O+Chavalar+Faro"
  },
  {
    "id": "v11-mercado-de-olhao",
    "cat": "market",
    "tier": "plenty",
    "priority": 11,
    "badge": "MARKET",
    "name": "Mercado de Olhão",
    "short": "Mercado de Olhão",
    "lat": 37.0282,
    "lng": -7.8425,
    "neighborhood": "Olhão (waterfront, 15 min de Faro)",
    "address": "Av. 5 de Outubro, Olhão",
    "phone": "",
    "hours": "Mon–Sat 07:00–13:00",
    "why": "Two red-brick halls on the waterfront — fish hall is the Algarve's largest. Since 1916. Saturday morning before 09:00 is the experience: boats unloading, regional producers outside the halls. Sardines EUR 4/kg.",
    "tags": [
      "Cult",
      "Free entry",
      "Walk-in",
      "Sat 7-9 AM best"
    ],
    "productTags": [
      "Market",
      "Produce"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Mercado+de+Olhão"
  },
  {
    "id": "v12-mercado-faro",
    "cat": "market",
    "tier": "plenty",
    "priority": 12,
    "badge": "MARKET",
    "name": "Mercado Municipal de Faro",
    "short": "Mercado de Faro",
    "lat": 37.0193,
    "lng": -7.9302,
    "neighborhood": "Faro Centro",
    "address": "Largo Dr. Francisco Sá Carneiro, Faro Centro",
    "phone": "",
    "hours": "Mon–Sat mornings",
    "why": "Smaller than Olhão's but convenient. Fresh fish, vegetables, fruit, flowers. Less theatre, more utility. Go early.",
    "tags": [
      "City Market",
      "Free entry",
      "Walk-in",
      "Morning"
    ],
    "productTags": [
      "Market"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Mercado+Municipal+Faro"
  },
  {
    "id": "v13-bago",
    "cat": "shop",
    "tier": "plenty",
    "priority": 13,
    "badge": "DRINK",
    "name": "Bago Wine Bar",
    "short": "Bago",
    "lat": 37.0175,
    "lng": -7.9345,
    "neighborhood": "Faro Centro",
    "address": "Faro Centro",
    "phone": "",
    "hours": "Evening",
    "why": "Natural wines by the glass, small Portuguese producers, good music. The closest thing Faro has to a serious wine bar. Raisin-listed.",
    "tags": [
      "Natural Wine",
      "EUR 5-12/glass",
      "Walk-in",
      "Evening"
    ],
    "productTags": [
      "Wine"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Bago+Wine+Bar+Faro"
  },
  {
    "id": "v14-hotel-faro-rooftop",
    "cat": "shop",
    "tier": "plenty",
    "priority": 14,
    "badge": "DRINK",
    "name": "Hotel Faro Rooftop",
    "short": "Hotel Faro Rooftop",
    "lat": 37.0166,
    "lng": -7.9319,
    "neighborhood": "Faro waterfront / Marina",
    "address": "Praça D. Francisco Gomes 2, Faro",
    "phone": "",
    "hours": "Sunset onwards",
    "why": "Best rooftop view in the city. Harbour below, Ria Formosa and barrier islands beyond. Go at sunset. Not cheap, but the view pays.",
    "tags": [
      "Well-known",
      "EUR 8-15/drink",
      "Walk-in",
      "Sunset"
    ],
    "productTags": [
      "Drink"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Hotel+Faro+rooftop"
  },
  {
    "id": "v15-morgado-do-quintao",
    "cat": "mainland",
    "tier": "plenty",
    "priority": 15,
    "badge": "WINE",
    "name": "Morgado do Quintão",
    "short": "Morgado do Quintão",
    "lat": 37.1583,
    "lng": -8.4083,
    "neighborhood": "Lagoa / Silves (45 min de Faro)",
    "address": "Quinta do Morgado do Quintão, between Lagoa and Silves",
    "phone": "",
    "hours": "Mon–Sat 16:00 (book ahead)",
    "why": "Family-run since 1910, winemaker Joana Maçanita (one of Portugal's best). Indigenous varieties — Negra Mole above all — organic, low-intervention. Tastings under a 2,000-year-old olive tree. Farmers' table lunch pairs family recipes with the wines.",
    "tags": [
      "Cult",
      "EUR 20-40 tasting",
      "Book ahead",
      "Afternoon"
    ],
    "productTags": [
      "Wine"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Morgado+do+Quintão"
  },
  {
    "id": "v16-vila-joya",
    "cat": "mainland",
    "tier": "plenty",
    "priority": 16,
    "badge": "MICHELIN",
    "name": "Vila Joya",
    "short": "Vila Joya",
    "lat": 37.0884,
    "lng": -8.2825,
    "neighborhood": "Albufeira (40 min de Faro)",
    "address": "Praia da Galé, Albufeira",
    "phone": "",
    "hours": "Dinner",
    "why": "Two Michelin stars since 1999. Cliffside. Austrian chef Dieter Koschina. French-leaning technique, Mediterranean soul. The longest-running high-end table in the Algarve.",
    "tags": [
      "2 Michelin Stars",
      "EUR 200+ tasting",
      "Essential",
      "Dinner"
    ],
    "productTags": [
      "Michelin"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Vila+Joya+Albufeira"
  },
  {
    "id": "v17-ocean-restaurant",
    "cat": "mainland",
    "tier": "plenty",
    "priority": 17,
    "badge": "MICHELIN",
    "name": "Ocean Restaurant",
    "short": "Ocean",
    "lat": 37.093,
    "lng": -8.4019,
    "neighborhood": "Porches / Vila Vita Parc (45 min de Faro)",
    "address": "Vila Vita Parc, Porches",
    "phone": "",
    "hours": "Dinner",
    "why": "Two Michelin stars since 2011. Chef Hans Neuner — Atlantic fish treated with central-European precision. Resort dining, but the cooking is real.",
    "tags": [
      "2 Michelin Stars",
      "EUR 200+ tasting",
      "Essential",
      "Dinner"
    ],
    "productTags": [
      "Michelin"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Ocean+Restaurant+Vila+Vita+Parc"
  },
  {
    "id": "v18-bon-bon",
    "cat": "mainland",
    "tier": "plenty",
    "priority": 18,
    "badge": "MICHELIN",
    "name": "Bon Bon",
    "short": "Bon Bon",
    "lat": 37.1018,
    "lng": -8.4731,
    "neighborhood": "Carvoeiro (40 min de Faro)",
    "address": "Sesmarias, Carvoeiro",
    "phone": "",
    "hours": "Dinner",
    "why": "One Michelin star. Chef Louis Anjos — the Essence Menu is a tightly edited celebration of Algarve biodiversity. Less resort, more personal vision.",
    "tags": [
      "1 Michelin Star",
      "EUR 120-160",
      "Essential",
      "Dinner"
    ],
    "productTags": [
      "Michelin"
    ],
    "maps": "https://www.google.com/maps/search/?api=1&query=Bon+Bon+Carvoeiro"
  },
  {
    "id": "p-bougie-vila-vita-parc",
    "cat": "bougie",
    "tier": "plenty",
    "priority": 90,
    "badge": "PRESTIGE",
    "name": "Vila Vita Parc",
    "neighborhood": "Porches — 45 min west",
    "short": "Vila Vita Parc",
    "lat": 37.0972,
    "lng": -8.4048,
    "tags": ["5★ Relais & Châteaux resort — cliffside, home of Ocean (2★ Michelin), 25,000-bottle cellar", "EUR 500+ rooms in season"],
    "productTags": [],
    "why": "5★ resort on the Atlantic cliffs at Porches. 22 ha subtropical gardens, several restaurants including Ocean (2★) and a 25,000-bottle cellar. The Algarve's reference for cliff-edge luxury — Relais & Châteaux for two decades. Travellers come for the rooms; chefs come for Ocean.",
    "address": "Alporchinhos, 8400-450 Porches",
    "phone": "",
    "hours": "Resort",
    "maps": "https://www.google.com/maps/search/?api=1&query=Vila+Vita+Parc+Porches"
  },
  {
    "id": "p-bougie-belmond-vinho-do-porto",
    "cat": "bougie",
    "tier": "plenty",
    "priority": 91,
    "badge": "PRESTIGE",
    "name": "Pousada Palácio de Estoi",
    "neighborhood": "Estoi — 10 min from Faro",
    "short": "Pousada Estoi",
    "lat": 37.0922,
    "lng": -7.8917,
    "tags": ["18th-c. rococo palace converted into a Pousada — French formal gardens, sierra views", "EUR 200-350 rooms"],
    "productTags": [],
    "why": "An 18th-century rococo palace converted into a Pousada (Portugal's historic-château hotel chain). French formal gardens, sierra views, restored ceilings. Restaurant runs European-Algarvian crossover at €50–90. Sleeping inside a Portuguese rococo palace, ten minutes from Faro centre.",
    "address": "R. de São José, 8005-465 Estoi",
    "phone": "",
    "hours": "Hotel",
    "maps": "https://www.google.com/maps/search/?api=1&query=Pousada+Palacio+de+Estoi"
  },
  {
    "id": "p-bougie-quintao-stay",
    "cat": "bougie",
    "tier": "plenty",
    "priority": 92,
    "badge": "AGRO-TURISMO",
    "name": "Morgado do Quintão — agroturismo",
    "neighborhood": "Lagoa / Silves — 40 min west",
    "short": "Morgado do Quintão (stay)",
    "lat": 37.1236,
    "lng": -8.4536,
    "tags": ["Family quinta since 1810 — converted-stable rooms, organic Negra Mole vineyard, 2,000-year-old olive tree", "EUR 200-400 rooms"],
    "productTags": [],
    "why": "The family quinta also runs a small agro-tourism operation — converted-stable rooms, pool in the orchard, breakfast on the terrace facing the vineyard. Right move for travellers who want to combine a wine-estate stay with the family-table lunch (booked separately, 48 h ahead). Private vineyard tours with the oenologist by arrangement.",
    "address": "Quinta do Morgado, 8400-410 Lagoa",
    "phone": "",
    "hours": "Year-round",
    "maps": "https://www.google.com/maps/search/?api=1&query=Morgado+do+Quintao+Lagoa"
  }
];
    const NEIGHBORHOODS = [
        { id: 'n-cidade-velha', name: 'Cidade Velha', center: [37.0145, -7.9358], radius: 200, maps_url: 'https://www.google.com/maps/search/?api=1&query=Cidade+Velha+Faro' },
        { id: 'n-faro-centro', name: 'Faro Centro', center: [37.0175, -7.9350], radius: 380, maps_url: 'https://www.google.com/maps/search/?api=1&query=Faro+Centro' },
        { id: 'n-marina', name: 'Marina / Doca', center: [37.0166, -7.9319], radius: 250, maps_url: 'https://www.google.com/maps/search/?api=1&query=Marina+de+Faro' },
        { id: 'n-mercado-faro', name: 'Mercado Municipal', center: [37.0193, -7.9302], radius: 120, maps_url: 'https://www.google.com/maps/search/?api=1&query=Mercado+Municipal+Faro' },
        { id: 'n-praia-faro', name: 'Praia de Faro / Ilha', center: [36.9961, -7.9929], radius: 600, maps_url: 'https://www.google.com/maps/search/?api=1&query=Praia+de+Faro' },
        { id: 'n-olhao', name: 'Olhão', center: [37.0282, -7.8425], radius: 700, maps_url: 'https://www.google.com/maps/search/?api=1&query=Olhao+waterfront' }
    ];
    const WALKS = [
        { id: 'w-cidade-velha-aube', name: 'Cidade Velha at dawn', start: [37.0143, -7.9359], maps_url: 'https://www.google.com/maps/search/?api=1&query=Sé+de+Faro' },
        { id: 'w-ria-formosa', name: 'Ria Formosa boardwalk', start: [37.0143, -7.9290], maps_url: 'https://www.google.com/maps/search/?api=1&query=Ria+Formosa+Faro' },
        { id: 'w-ilha-deserta', name: 'Ilha Deserta', start: [37.0136, -7.9333], maps_url: 'https://www.google.com/maps/search/?api=1&query=Ilha+Deserta+ferry+Faro' },
        { id: 'w-tavira-bird', name: 'Tavira / bird-watching', start: [37.1262, -7.6498], maps_url: 'https://www.google.com/maps/search/?api=1&query=Tavira+old+town' },
        { id: 'w-cabo-sao-vicente', name: 'Cabo de São Vicente', start: [37.0234, -8.9947], maps_url: 'https://www.google.com/maps/search/?api=1&query=Cabo+de+Sao+Vicente' }
    ];
    const WORK_SPOTS = [
        { id: 'p-work-biblioteca', name: 'Biblioteca Municipal', start: [37.0192, -7.9325] },
        { id: 'p-work-jardim-manuel-bivar', name: 'Jardim Manuel Bívar', start: [37.0162, -7.9347] },
        { id: 'p-work-cafe-aliança', name: 'Café Aliança', start: [37.0163, -7.9335] },
        { id: 'p-work-marina', name: 'Marina', start: [37.0166, -7.9319] },
        { id: 'p-work-praia-faro', name: 'Praia de Faro', start: [36.9961, -7.9929] }
    ];
    const LANDMARKS = [
        { id: 'l-se-faro', name: 'Sé (Faro Cathedral)', coords: [37.0143, -7.9359], maps_url: 'https://www.google.com/maps/search/?api=1&query=Sé+de+Faro' },
        { id: 'l-arco-da-vila', name: 'Arco da Vila', coords: [37.0156, -7.9362], maps_url: 'https://www.google.com/maps/search/?api=1&query=Arco+da+Vila+Faro' },
        { id: 'l-ria-formosa', name: 'Ria Formosa Natural Park', coords: [37.0050, -7.8800], maps_url: 'https://www.google.com/maps/search/?api=1&query=Ria+Formosa+Natural+Park' },
        { id: 'l-ilha-deserta', name: 'Ilha Deserta', coords: [36.9614, -7.8980], maps_url: 'https://www.google.com/maps/search/?api=1&query=Ilha+Deserta+Faro' },
        { id: 'l-tavira', name: 'Tavira (old town)', coords: [37.1262, -7.6498], maps_url: 'https://www.google.com/maps/search/?api=1&query=Tavira+old+town' }
    ];
    return { VENUES, COLORS, CAT_LABELS, PRODUCT_COLORS, NEIGHBORHOODS, WALKS, WORK_SPOTS, LANDMARKS };
})();
