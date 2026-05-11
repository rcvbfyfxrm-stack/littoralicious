/* Port Call St. Barth — data file.
   Suppliers, berths, watch-outs. Phones marked TBC are recommended venues
   whose number is not yet verified — call once and update before printing. */
window.PCV_DATA = (function () {
    const COLORS = {
        berth:    '#c4a35a',
        market:   '#d97706',
        shop:     '#059669',
        mainland: '#7c3aed',  // re-purposed: "off-island" (St. Martin imports)
        logistics:'#2d4a5e'
    };
    const CAT_LABELS = {
        berth:'Berth',
        market:'Market / Direct',
        shop:'Specialty / Wine',
        mainland:'Off-island (St. Martin)',
        logistics:'Logistics / Agent'
    };
    const PRODUCT_COLORS = {
        'Berth':       '#c4a35a',
        'Anchorage':   '#0d9488',
        'Agent':       '#1a2a3a',
        'Logistics':   '#2d4a5e',
        'Cargo ferry': '#0ea5e9',
        'Fish':        '#3b82f6',
        'Lobster':     '#dc2626',
        'Meat':        '#b91c1c',
        'Wagyu':       '#7f1d1d',
        'Charcuterie': '#9d174d',
        'Cheese':      '#eab308',
        'Wine':        '#7c2d12',
        'Spirits':     '#7c2d12',
        'Champagne':   '#fbbf24',
        'Caviar':      '#0f172a',
        'Truffle':     '#1f2937',
        'Produce':     '#15803d',
        'Tropical':    '#16a34a',
        'Bread':       '#a16207',
        'Pâtisserie':  '#b45309',
        'Dry Store':   '#6b7280',
        'One-Stop':    '#475569',
        'Online':      '#0ea5e9',
        'Creole':      '#ea580c'
    };

    // ============ VENUES ============
    const VENUES = [
        // ---------- BERTHS / ANCHORAGES ----------
        { id:'gustavia', cat:'berth', tier:'berth_top', priority:1, badge:'PRIMARY',
          name:"Port de Gustavia (Capitainerie)", short:"Gustavia",
          lat:17.8970, lng:-62.8519,
          tags:['Megayacht to ~75m','Mediterranean-moor','Capital harbour'],
          productTags:['Berth'],
          why:"The capital's commercial harbour. Stern-to with anchor (Med-moor). Vessels to ~75m on the inner quay; larger anchor in the bay. Walking distance to every supplier in town and the Vichy/Match supermarkets. The only port in St. Barth with serious chandlery + dockside delivery infrastructure.",
          address:"Rue Charles de Gaulle, Gustavia, 97133 Saint-Barthélemy",
          phone:"+590 590 27 66 97", email:"port@portdegustavia.com",
          web:"https://www.portdegustavia.com", hours:"VHF 12 / 16",
          maps:"https://www.google.com/maps/search/?api=1&query=Port+de+Gustavia+Saint+Barthelemy" },

        { id:'colombier', cat:'berth', tier:'berth_top', priority:2, badge:'ANCHORAGE',
          name:"Anse de Colombier (anchorage)", short:"Colombier",
          lat:17.9215, lng:-62.8627,
          tags:['Anchorage','Protected NW','Marine reserve','No dock'],
          productTags:['Anchorage','Berth'],
          why:"Best protected anchorage on the island, north-west tip. Good holding in 5–12 m sand. Marine reserve (mooring buoys, anchoring restrictions enforced). 30-min tender ride to Gustavia for provisioning — slow water taxi or own RIB. The principal-friendly choice when Gustavia is full or Bucket Regatta has the harbour locked.",
          address:"Anse de Colombier, north-west tip of Saint-Barthélemy",
          phone:"", email:"", web:"", hours:"24/7 anchorage",
          maps:"https://www.google.com/maps/search/?api=1&query=Anse+de+Colombier+Saint+Barthelemy" },

        { id:'public', cat:'berth', tier:'berth_top', priority:3, badge:'ALT',
          name:"Public (alternative + tenders)", short:"Public",
          lat:17.9020, lng:-62.8550,
          tags:['Tender base','Small craft','Salines side'],
          productTags:['Berth','Logistics'],
          why:"Small-craft harbour just east of Gustavia, used as a tender base by yachts anchored off Gustavia or Shell Beach. Useful when Gustavia's stern-to is full and you need a working tender pier. Walk to Eden Rock-area suppliers in ~15 min.",
          address:"Public, Gustavia, 97133 Saint-Barthélemy",
          phone:"", email:"", web:"", hours:"",
          maps:"https://www.google.com/maps/search/?api=1&query=Public+Saint+Barthelemy" },

        // ---------- AGENTS / LOGISTICS ----------
        { id:'wimco', cat:'logistics', tier:'notime', priority:1, badge:'AGENT',
          name:"WIMCO Yacht Services / IGY-Gustavia agents", short:"Yacht Agent",
          lat:17.8970, lng:-62.8519,
          tags:['Customs','Provisioning','Tender coordination'],
          productTags:['Agent','Logistics'],
          why:"WIMCO and the IGY-affiliated Gustavia agents are the standard yacht concierges on the island — customs paperwork, supplier coordination, tender slots, restaurant bookings, helicopter to St. Martin. The first call before any St. Barth visit. They also handle the Bucket Regatta and Voiles de St-Barth registrations.",
          address:"Rue Auguste Nyman, Gustavia",
          phone:"+590 590 51 04 00", email:"info@wimcovillas.com",
          web:"https://www.wimco.com", hours:"Mon–Sat 09:00–18:00",
          maps:"https://www.google.com/maps/search/?api=1&query=WIMCO+Gustavia+Saint+Barthelemy" },

        { id:'voyager', cat:'logistics', tier:'notime', priority:2, badge:'FERRY',
          name:"Voyager (cargo ferry from St. Martin)", short:"Voyager Ferry",
          lat:17.8975, lng:-62.8530,
          tags:['Cargo','Mon/Wed/Fri','From Marigot/Oyster Pond'],
          productTags:['Cargo ferry','Logistics'],
          why:"The lifeline. Voyager runs ~3 times a week from St. Martin (Marigot or Oyster Pond) to Gustavia carrying passengers AND cargo — pallets of fresh produce, dairy, refrigerated goods, wine cases. Most St. Martin-sourced provisioning rides this boat. ~75 min crossing.",
          address:"Quai Général de Gaulle, Gustavia",
          phone:"+590 590 87 10 68", email:"info@voy12.com",
          web:"https://www.voy12.com", hours:"Mon · Wed · Fri (verify schedule weekly)",
          maps:"https://www.google.com/maps/search/?api=1&query=Voyager+Ferry+Gustavia+Saint+Barthelemy" },

        { id:'edge', cat:'logistics', tier:'plenty', priority:1, badge:'FERRY',
          name:"Great Bay Express (St. Martin alt)", short:"Great Bay Express",
          lat:17.8975, lng:-62.8530,
          tags:['Cargo','Daily','Philipsburg / Oyster Pond'],
          productTags:['Cargo ferry','Logistics'],
          why:"Backup to Voyager when their schedule doesn't fit. Daily-ish service from Dutch St. Martin (Philipsburg). Useful for last-minute or contingency runs.",
          address:"Quai Général de Gaulle, Gustavia",
          phone:"+1 721 542 0032", email:"",
          web:"https://www.greatbayexpress.com", hours:"Daily — verify schedule",
          maps:"https://www.google.com/maps/search/?api=1&query=Great+Bay+Express+Saint+Martin" },

        // ---------- IN-TIME WHOLESALE / SUPERMARKETS ----------
        { id:'amc', cat:'mainland', tier:'notime', priority:1, badge:'TOP',
          name:"AMC Marché U (Saint-Jean)", short:"Marché U",
          lat:17.9018, lng:-62.8398,
          tags:['Largest supermarket','French staples','Wine + cheese'],
          productTags:['One-Stop','Dry Store','Cheese','Wine','Charcuterie'],
          why:"The largest supermarket on the island. Decent French cheese counter, charcuterie, wine selection (Bordeaux/Burgundy at Paris prices), full dry-goods aisle. Fresh produce gets restocked when the boat lands — empty by the next morning. Open 7 days, but with reduced Sunday hours.",
          address:"Rue de la Pointe, Saint-Jean, 97133 Saint-Barthélemy",
          phone:"+590 590 27 68 16", email:"",
          web:"", hours:"Mon–Sat 07:30–20:00 · Sun 08:00–13:00",
          maps:"https://www.google.com/maps/search/?api=1&query=AMC+Marche+U+Saint+Jean+Saint+Barthelemy" },

        { id:'match', cat:'mainland', tier:'notime', priority:2,
          name:"Match Supermarket (Gustavia)", short:"Match",
          lat:17.8980, lng:-62.8505,
          tags:['Walking distance from port','Smaller','Handy'],
          productTags:['One-Stop','Dry Store'],
          why:"Smaller than AMC but two minutes' walk from the Gustavia quay. The grab-and-go for last-minute items when the bulk run is already done. Wine, dairy, basics.",
          address:"Rue Roi Oscar II, Gustavia, 97133 Saint-Barthélemy",
          phone:"+590 590 27 68 16", email:"",
          web:"", hours:"Mon–Sat 07:30–20:00 · Sun 08:00–13:00",
          maps:"https://www.google.com/maps/search/?api=1&query=Match+Supermarket+Gustavia+Saint+Barthelemy" },

        // ---------- SEVERAL DAYS — SPECIALTY ----------
        { id:'maya', cat:'shop', tier:'several', priority:1, badge:'TOP',
          name:"Maya's To Go (Public)", short:"Maya's To Go",
          lat:17.9018, lng:-62.8580,
          tags:['Gourmet','Pre-prepared','Salads + plates','Eden Rock-tier'],
          productTags:['One-Stop','Charcuterie','Cheese'],
          why:"The gourmet to-go institution next to Eden Rock. Pre-prepared salads, plates, charcuterie, gourmet sandwiches at French-island prices. Where the principal eats lunch before guests arrive. Order ahead for charter-day platters.",
          address:"Public Beach, Public, 97133 Saint-Barthélemy",
          phone:"+590 590 29 83 70", email:"",
          web:"", hours:"Mon–Sat 07:00–19:00 · Sun 07:00–14:00",
          maps:"https://www.google.com/maps/search/?api=1&query=Mayas+To+Go+Saint+Barthelemy" },

        { id:'cellier', cat:'shop', tier:'several', priority:2, badge:'WINE',
          name:"Le Cellier du Gouverneur (Gustavia)", short:"Le Cellier",
          lat:17.8975, lng:-62.8530,
          tags:['Bordeaux','Burgundy','Champagne','Case orders'],
          productTags:['Wine','Champagne','Spirits'],
          why:"The serious wine merchant in Gustavia. Bordeaux + Burgundy at French-import prices (less than Paris RM but more than Bordeaux), Champagne by the case, eaux-de-vie. The case-order go-to for Caribbean charter wine programs.",
          address:"Rue Charles de Gaulle, Gustavia, 97133 Saint-Barthélemy",
          phone:"+590 590 27 67 64", email:"",
          web:"", hours:"Mon–Sat 09:00–13:00, 16:00–19:00 · closed Sun",
          maps:"https://www.google.com/maps/search/?api=1&query=Le+Cellier+du+Gouverneur+Gustavia" },

        { id:'colombe', cat:'shop', tier:'several', priority:3, badge:'BREAD',
          name:"La Petite Colombe (Lorient + Saint-Jean)", short:"La Petite Colombe",
          lat:17.9072, lng:-62.8217,
          tags:['Croissants','Sourdough','Pâtisserie','Two locations'],
          productTags:['Bread','Pâtisserie'],
          why:"The bakery + pâtisserie of the island. Croissants that hold up against any Paris benchmark, real sourdough, pâtisseries that the principal will recognise. Two locations (Lorient + Saint-Jean). Order 24 h ahead for breakfast volume.",
          address:"Lorient + Saint-Jean, Saint-Barthélemy",
          phone:"+590 590 29 74 30", email:"",
          web:"", hours:"Tue–Sun 06:30–13:30 · closed Mon",
          maps:"https://www.google.com/maps/search/?api=1&query=La+Petite+Colombe+Saint+Barthelemy" },

        { id:'choisy', cat:'shop', tier:'several', priority:4,
          name:"Boulangerie Choisy (Saint-Jean)", short:"Boulangerie Choisy",
          lat:17.9018, lng:-62.8385,
          tags:['Daily bread','Brioche','Backup bakery'],
          productTags:['Bread','Pâtisserie'],
          why:"Backup to La Petite Colombe. Daily bread, viennoiseries, brioche. Useful when Choisy doesn't have your volume or you need a Saint-Jean stop on the same run.",
          address:"Saint-Jean, Saint-Barthélemy",
          phone:"+590 590 27 76 86", email:"",
          web:"", hours:"Mon–Sat 06:00–13:00",
          maps:"https://www.google.com/maps/search/?api=1&query=Boulangerie+Choisy+Saint+Barthelemy" },

        { id:'jojo', cat:'shop', tier:'several', priority:5,
          name:"JoJo Supermarket (Lorient)", short:"JoJo",
          lat:17.9072, lng:-62.8225,
          tags:['Local','Creole','Lorient side'],
          productTags:['One-Stop','Creole'],
          why:"Smaller Lorient-side supermarket with a local-Creole tilt. Where the local crews shop. Worth a stop if you're already at the Lorient bakery, or if Saint-Jean is saturated.",
          address:"Lorient, 97133 Saint-Barthélemy",
          phone:"", email:"",
          web:"", hours:"Mon–Sat 07:30–19:00",
          maps:"https://www.google.com/maps/search/?api=1&query=JoJo+Supermarche+Lorient+Saint+Barthelemy" },

        // ---------- PLENTY OF TIME — DIRECT / OFF-ISLAND / DEEP CUT ----------
        { id:'fish-direct', cat:'market', tier:'plenty', priority:1, badge:'DIRECT',
          name:"Direct from local fishermen (Corossol / Lorient)", short:"Local fishermen",
          lat:17.9027, lng:-62.8568,
          tags:['Off the boat','Mahi','Wahoo','Lobster','Cash'],
          productTags:['Fish','Lobster'],
          why:"The serious fish moves off the boat at Corossol or the Lorient pier when the local fishermen come in (mid-morning). Mahi, wahoo, snapper, spiny lobster in season. No fixed market — build a relationship with one or two fishermen. Cash. The yacht-agent network knows who's reliable.",
          address:"Corossol pier + Lorient pier",
          phone:"", email:"",
          web:"", hours:"Mid-morning landings",
          maps:"https://www.google.com/maps/search/?api=1&query=Corossol+Saint+Barthelemy" },

        { id:'crémerie', cat:'shop', tier:'plenty', priority:2, badge:'CHEESE',
          name:"La Crèmerie (Saint-Jean)", short:"La Crèmerie",
          lat:17.9018, lng:-62.8390,
          tags:['French cheese','Fresh imports','Cut to order'],
          productTags:['Cheese','Charcuterie'],
          why:"Real fromagerie next to the Saint-Jean shopping cluster. Fresh French imports cut to order — Comté, Saint-Nectaire, Camembert au lait cru, chèvre. Charcuterie counter alongside. The chef-grade cheese option when AMC's pre-cut wedges aren't enough.",
          address:"Saint-Jean, 97133 Saint-Barthélemy",
          phone:"", email:"",
          web:"", hours:"Tue–Sat 09:00–13:00, 15:30–19:00 · closed Sun/Mon",
          maps:"https://www.google.com/maps/search/?api=1&query=La+Cremerie+Saint+Jean+Saint+Barthelemy" },

        { id:'carrefour-mart', cat:'mainland', tier:'plenty', priority:3, badge:'OFF-ISLAND',
          name:"Carrefour Hyper Marigot (St. Martin)", short:"Carrefour St. Martin",
          lat:18.0700, lng:-63.0833,
          tags:['Off-island','Hypermarket','True bulk','Wagyu + premium meat'],
          productTags:['One-Stop','Wagyu','Meat','Dry Store','Cheese'],
          why:"Hypermarket on French St. Martin (Marigot). Where serious yacht chefs source premium proteins (Wagyu, dry-aged), bulk dry goods, the wider French-import range. Day trip via the Voyager ferry or charter helicopter; load palletised provisions onto the cargo ferry back. The true bulk answer for a long-charter loadout.",
          address:"Howell Center, Marigot, Saint-Martin",
          phone:"+590 590 87 12 12", email:"",
          web:"https://www.carrefour.fr", hours:"Mon–Sat 08:30–20:00 · Sun 09:00–13:00",
          maps:"https://www.google.com/maps/search/?api=1&query=Carrefour+Hyper+Marigot+Saint+Martin" },

        { id:'stmartin-yacht-prov', cat:'mainland', tier:'plenty', priority:4,
          name:"Tropical Provisioning (St. Martin)", short:"Tropical Provisioning",
          lat:18.0700, lng:-63.0833,
          tags:['Yacht-grade','Marigot','Direct delivery'],
          productTags:['One-Stop','Meat','Cheese','Wine'],
          why:"St. Martin–based yacht-provisioning operator that delivers directly to the Voyager / Great Bay Express dock for pickup in Gustavia. The hands-off way to bulk-source from St. Martin without a personal day trip. Premium markup vs DIY but saves a full day.",
          address:"Marigot, Saint-Martin",
          phone:"+590 590 29 38 89", email:"",
          web:"", hours:"Mon–Sat",
          maps:"https://www.google.com/maps/search/?api=1&query=Tropical+Provisioning+Saint+Martin" }
    ];

    // Auto-fill productTags where omitted
    VENUES.forEach(v => {
        if (!v.productTags || !v.productTags.length) {
            v.productTags = v.cat === 'berth' ? ['Berth']
                : v.cat === 'logistics' ? ['Logistics']
                : [];
        }
    });

    // ============ WATCH-OUTS ============
    // Severity = 'high' | 'medium' | 'low' | 'info'. Section renders only high + medium.
    const WATCHOUTS = [
        { id:'wo-nye-supplies',
          title:"New Year's week — supplies vanish from the island",
          when:'~28 December – 5 January (annually, every year)',
          severity:'high',
          what:"Eggs, dairy, fresh produce, baguettes — the island is over-saturated by NYE charters and the cargo ferry can't keep up. One yacht chef arrived for NYE and could not find eggs anywhere on St. Barth for three days. Supermarket shelves stripped by 30 Dec; the Voyager ferry runs at capacity but doesn't catch up until ~6 Jan.",
          workaround:"Provision the entire NYE block BEFORE 23 December — load a full fortnight of eggs, dairy, butter, flour, fresh herbs. Pre-arrange a backup supplier on St. Martin (Carrefour Marigot or Tropical Provisioning) with confirmed Voyager-ferry slots. Have UHT/long-life dairy as a fallback. Bake your own bread — La Petite Colombe runs out by 09:00 every NYE morning." },

        { id:'wo-bucket-regatta',
          title:"St. Barth Bucket Regatta — port locked",
          when:'Mid-March (3-day regatta, ~16 boats invited but the entire port is given over to it)',
          severity:'high',
          what:"The Bucket is a 30+ year invitational megayacht regatta. Gustavia harbour is reorganised entirely for the event — stern-to slots, race village, paparazzi, helicopter overflights. Walk-in restaurant tables impossible. Suppliers prioritise the Bucket fleet's standing orders.",
          workaround:"If you're IN the Bucket, your agent has handled this — confirm everything 6 weeks ahead anyway. If you're NOT in the Bucket, anchor at Colombier or move to St. Martin for the week. Don't try to provision in Gustavia — the suppliers physically cannot serve walk-ins during the regatta." },

        { id:'wo-voiles',
          title:"Voiles de Saint-Barth — second port-lock event",
          when:'Mid-April (Easter week-ish, 6-day classic-yacht regatta)',
          severity:'high',
          what:"Companion event to the Bucket but for racing classics + super-Maxis. Same dynamic — Gustavia full, restaurants booked, suppliers maxed. Often overlaps with Easter, compounding the closures.",
          workaround:"Same as the Bucket. Either be in it (and let the agent handle it) or be elsewhere. If you must be in port, anchor in Colombier and tender in for essentials only." },

        { id:'wo-hurricane',
          title:'Hurricane season — supply chain risk',
          when:'1 June – 30 November (peak Aug–Oct)',
          severity:'high',
          what:"Active named-storm watches stop the Voyager ferry for 24–72 h. With St. Barth dependent on the daily-ish ferry from St. Martin, even a near-miss strips supermarket shelves in 24 h (panic-buying). 2017 (Irma) shut the island for months — recovery framework still informs how locals stockpile.",
          workaround:"Maintain a 7-day storm provision buffer onboard from June onward. Subscribe to Météo France / NHC alerts. If a named storm is 5 days out, complete provisioning immediately — wait 24 h and shelves are empty. Have a Plan B port (Antigua, BVI, Saint-Martin) confirmed in advance." },

        { id:'wo-ferry-schedule',
          title:'Voyager cargo ferry runs only 3 days a week',
          when:'Year-round (Mon · Wed · Fri typical, verify weekly)',
          severity:'medium',
          what:"Most cold-chain provisioning from St. Martin lands on the ferry days (Mon / Wed / Fri). Order in too late on a Thursday and you're waiting until Monday. Sunday-Tuesday windows can be lean for fresh imports.",
          workaround:"Lock supplier orders on St. Martin to land on Wednesday's ferry for a Thursday-arrival charter. For Saturday-arrival, order to Friday's ferry. Build the menu around Sunday-arrival fresh-fish (off the boat at Corossol, ferry-independent)." },

        { id:'wo-restaurant-bookings',
          title:'Restaurant bookings need 4–6 weeks for high season',
          when:'High season (mid-Dec → mid-April)',
          severity:'medium',
          what:"The principal-tier rooms (Le Bonito, Le Tamarin, Bagatelle, Bonito's beach lunch slots) book out 4–6 weeks ahead in high season. Eden Rock dining 8 weeks. Walk-in is a fantasy.",
          workaround:"Have the agent (WIMCO) lock the principal's restaurant calendar before arrival. For Bonito and Tamarin specifically, book at the same time you book the slip." },

        { id:'wo-sunday-closures',
          title:'Most specialty shops closed Sunday afternoon + Monday',
          when:'Year-round',
          severity:'medium',
          what:"Le Cellier (wine), La Crèmerie (cheese), La Petite Colombe (bakery — closed Mondays specifically) — most non-supermarket suppliers shut Sunday afternoon and either all of Monday or Monday morning. AMC and Match are the Sunday/Monday fallbacks.",
          workaround:"Don't schedule a specialty-shopping run on Sunday afternoon or Monday morning. The cheese + wine + bread runs go on Tuesday–Saturday." }
    ];

    return { VENUES, COLORS, CAT_LABELS, PRODUCT_COLORS, WATCHOUTS };
})();
