export interface ChecklistItem {
  id: number;
  task: string;
  completed: boolean;
  dueDate: string;
  category: string;
  priority: 'green' | 'yellow' | 'red';
}

export interface StationAssignment {
  id: number;
  bereich: string;
  zeit: string;
  personen: string[];
  bedarf: number;
  status: 'complete' | 'incomplete';
  priority: 'green' | 'yellow' | 'red';
}

export interface Resource {
  id: number;
  item: string;
  menge: string;
  einheit: string;
  status: 'bestellt' | 'offen';
  lieferant: string;
  kosten: string;
  priority: 'green' | 'yellow' | 'red';
}

export interface FestivalData {
  name: string;
  location: string;
  startDate: string;
  endDate?: string;
  type?: string;
  visitorCount: string;
}

export function generateFestivalPlan(festivalData: FestivalData, members: any[] = []) {
  const checklist = generateChecklist(festivalData);
  const stations = generateStations(festivalData);
  const resources = generateResources(festivalData);
  const shifts = generateShifts(festivalData);
  const shiftStations = generateShiftStations(festivalData);
  
  return { checklist, stations, resources, shifts, shiftStations };
}

function generateChecklist(festivalData: FestivalData): ChecklistItem[] {
  const baseChecklist = [
    // 6 Monate vorher
    { task: "Genehmigung beim Amt beantragen", category: "Behörden", monthsOffset: -6, priority: 'red' as const },
    { task: "Versicherung abschließen", category: "Versicherung", monthsOffset: -6, priority: 'red' as const },
    
    // 2 Monate vorher
    { task: "Zelt und Bühne organisieren", category: "Ausstattung", monthsOffset: -2, priority: 'yellow' as const },
    { task: "Musik/DJ buchen", category: "Entertainment", monthsOffset: -2, priority: 'green' as const },
    { task: "Lieferanten kontaktieren", category: "Verpflegung", monthsOffset: -2, priority: 'yellow' as const },
    
    // 2 Wochen vorher
    { task: "Flyer und Plakate drucken", category: "Marketing", monthsOffset: -0.5, priority: 'green' as const },
    { task: "Getränke bestellen", category: "Verpflegung", monthsOffset: -0.5, priority: 'yellow' as const },
    
    // 1 Woche vorher
    { task: "Helfer einteilen", category: "Personal", monthsOffset: -0.25, priority: 'red' as const },
    { task: "Sicherheitsdienst organisieren", category: "Sicherheit", monthsOffset: -0.25, priority: 'red' as const },
    
    // Vortag
    { task: "Aufbau und Dekoration", category: "Vorbereitung", monthsOffset: -0.003, priority: 'yellow' as const },
    { task: "Technik testen", category: "Technik", monthsOffset: -0.003, priority: 'green' as const },
    
    // Eventtag
    { task: "Letzte Vorbereitungen", category: "Event", monthsOffset: 0, priority: 'green' as const },
    
    // Nachbereitung
    { task: "Aufräumen und Abbau", category: "Nachbereitung", monthsOffset: 0.003, priority: 'yellow' as const },
    { task: "Abrechnung erstellen", category: "Nachbereitung", monthsOffset: 0.1, priority: 'green' as const }
  ];

  // Festival-spezifische Ergänzungen
  const festivalSpecific = getFestivalSpecificTasks(festivalData.type);
  const visitorSpecific = getVisitorSpecificTasks(festivalData.visitorCount);
  
  const allTasks = [...baseChecklist, ...festivalSpecific, ...visitorSpecific];
  
  const startDate = new Date(festivalData.startDate);
  
  return allTasks.map((task, index) => {
    const dueDate = new Date(startDate);
    if (task.monthsOffset !== 0) {
      dueDate.setMonth(startDate.getMonth() + task.monthsOffset);
    } else if (task.monthsOffset > 0) {
      dueDate.setDate(startDate.getDate() + 1);
    }
    
    return {
      id: index + 1,
      task: task.task,
      completed: Math.random() > 0.6, // Zufällige Completion für Demo
      dueDate: dueDate.toISOString().split('T')[0],
      category: task.category,
      priority: task.priority
    };
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

function getFestivalSpecificTasks(type: string) {
  const tasks: { [key: string]: any[] } = {
    feuerwehr: [
      { task: "Feuerwehrauto als Deko", category: "Dekoration", monthsOffset: -0.25, priority: 'green' },
      { task: "Uniformen für Helfer", category: "Ausstattung", monthsOffset: -0.5, priority: 'yellow' }
    ],
    musik: [
      { task: "Verstärker und PA mieten", category: "Technik", monthsOffset: -1, priority: 'red' },
      { task: "Bühnenbeleuchtung", category: "Technik", monthsOffset: -0.5, priority: 'yellow' }
    ],
    kirtag: [
      { task: "Karussell organisieren", category: "Attraktionen", monthsOffset: -2, priority: 'yellow' },
      { task: "Würstelbude aufstellen", category: "Verpflegung", monthsOffset: -0.25, priority: 'green' }
    ],
    wein: [
      { task: "Weinkarten drucken", category: "Marketing", monthsOffset: -0.5, priority: 'green' },
      { task: "Weinverkostung vorbereiten", category: "Verpflegung", monthsOffset: -0.25, priority: 'yellow' }
    ],
    weihnachten: [
      { task: "Weihnachtsdeko besorgen", category: "Dekoration", monthsOffset: -1, priority: 'yellow' },
      { task: "Glühweinstand aufbauen", category: "Verpflegung", monthsOffset: -0.25, priority: 'red' }
    ]
  };
  
  return tasks[type] || [];
}

function getVisitorSpecificTasks(visitorCount: string) {
  const tasks: { [key: string]: any[] } = {
    large: [
      { task: "Zusätzliche Toiletten", category: "Ausstattung", monthsOffset: -1, priority: 'red' },
      { task: "Parkplatz organisieren", category: "Logistik", monthsOffset: -0.5, priority: 'yellow' }
    ],
    xlarge: [
      { task: "Sicherheitskräfte aufstocken", category: "Sicherheit", monthsOffset: -0.5, priority: 'red' },
      { task: "Notausgang markieren", category: "Sicherheit", monthsOffset: -0.25, priority: 'red' },
      { task: "Erste-Hilfe-Station", category: "Sicherheit", monthsOffset: -0.25, priority: 'red' }
    ]
  };
  
  return tasks[visitorCount] || [];
}

function generateStations(festivalData: FestivalData): StationAssignment[] {
  const baseStations = [
    { bereich: "Kassa", bedarf: 2, priority: 'red' as const },
    { bereich: "Ausschank", bedarf: 2, priority: 'yellow' as const },
    { bereich: "Grill", bedarf: 3, priority: 'green' as const }
  ];
  
  const festivalStations = getFestivalSpecificStations(festivalData.type);
  const visitorStations = getVisitorSpecificStations(festivalData.visitorCount);
  
  const allStations = [...baseStations, ...festivalStations, ...visitorStations];
  
  return allStations.map((station, index) => {
    const isComplete = Math.random() > 0.4;
    const assignedPeople = isComplete ? 
      generateRandomNames(station.bedarf) : 
      generateRandomNames(Math.max(1, station.bedarf - 1));
    
    return {
      id: index + 1,
      bereich: station.bereich,
      zeit: index % 2 === 0 ? "Samstag 16:00-20:00" : "Sonntag 11:00-15:00",
      personen: assignedPeople,
      bedarf: station.bedarf,
      status: isComplete ? 'complete' : 'incomplete',
      priority: station.priority
    };
  });
}

function getFestivalSpecificStations(type: string) {
  const stations: { [key: string]: any[] } = {
    feuerwehr: [
      { bereich: "Feuerwehrshow", bedarf: 4, priority: 'green' }
    ],
    musik: [
      { bereich: "Bühne/Technik", bedarf: 3, priority: 'red' },
      { bereich: "Einlass", bedarf: 2, priority: 'yellow' }
    ],
    kirtag: [
      { bereich: "Karussell", bedarf: 2, priority: 'yellow' },
      { bereich: "Tombola", bedarf: 2, priority: 'green' }
    ],
    wein: [
      { bereich: "Weinverkostung", bedarf: 3, priority: 'yellow' }
    ],
    weihnachten: [
      { bereich: "Glühweinstand", bedarf: 2, priority: 'red' },
      { bereich: "Kekse & Süßes", bedarf: 1, priority: 'green' }
    ]
  };
  
  return stations[type] || [];
}

function getVisitorSpecificStations(visitorCount: string) {
  const stations: { [key: string]: any[] } = {
    large: [
      { bereich: "Parkplatz", bedarf: 2, priority: 'yellow' }
    ],
    xlarge: [
      { bereich: "Sicherheit", bedarf: 4, priority: 'red' },
      { bereich: "Erste Hilfe", bedarf: 2, priority: 'red' }
    ]
  };
  
  return stations[visitorCount] || [];
}

function generateResources(festivalData: FestivalData): Resource[] {
  const baseResources = [
    { item: "Bier (Fass 50l)", menge: "8", einheit: "Stück", lieferant: "Brauerei Stainz", kosten: "€ 800", priority: 'green' as const },
    { item: "Garnituren (Tisch + 2 Bänke)", menge: "15", einheit: "Sets", lieferant: "Zeltverleih Graz", kosten: "€ 300", priority: 'yellow' as const },
    { item: "Zelt 10x20m", menge: "1", einheit: "Stück", lieferant: "Zeltverleih Graz", kosten: "€ 800", priority: 'red' as const }
  ];
  
  const festivalResources = getFestivalSpecificResources(festivalData.type);
  const visitorResources = getVisitorSpecificResources(festivalData.visitorCount);
  
  const allResources = [...baseResources, ...festivalResources, ...visitorResources];
  
  return allResources.map((resource, index) => ({
    id: index + 1,
    item: resource.item,
    menge: resource.menge,
    einheit: resource.einheit,
    status: Math.random() > 0.5 ? 'bestellt' : 'offen',
    lieferant: resource.lieferant,
    kosten: resource.kosten,
    priority: resource.priority
  }));
}

function getFestivalSpecificResources(type: string) {
  const resources: { [key: string]: any[] } = {
    feuerwehr: [
      { item: "Würstel", menge: "300", einheit: "Stück", lieferant: "Fleischerei Huber", kosten: "€ 450", priority: 'green' }
    ],
    musik: [
      { item: "PA-Anlage", menge: "1", einheit: "Set", lieferant: "Tontechnik Wien", kosten: "€ 1200", priority: 'red' },
      { item: "Bühne 8x6m", menge: "1", einheit: "Stück", lieferant: "Bühnenbau Graz", kosten: "€ 1500", priority: 'red' }
    ],
    wein: [
      { item: "Weingläser", menge: "200", einheit: "Stück", lieferant: "Gastro Service", kosten: "€ 120", priority: 'yellow' }
    ],
    weihnachten: [
      { item: "Glühwein", menge: "50", einheit: "Liter", lieferant: "Getränke Mayer", kosten: "€ 200", priority: 'yellow' },
      { item: "Weihnachtsdeko", menge: "1", einheit: "Paket", lieferant: "Deko Schmidt", kosten: "€ 150", priority: 'green' }
    ]
  };
  
  return resources[type] || [];
}

function getVisitorSpecificResources(visitorCount: string) {
  const resources: { [key: string]: any[] } = {
    medium: [
      { item: "Zusätzliche Garnituren", menge: "5", einheit: "Sets", lieferant: "Zeltverleih Graz", kosten: "€ 100", priority: 'yellow' }
    ],
    large: [
      { item: "Mobile Toiletten", menge: "4", einheit: "Stück", lieferant: "Sanitär Service", kosten: "€ 400", priority: 'red' },
      { item: "Zusätzliches Zelt", menge: "1", einheit: "Stück", lieferant: "Zeltverleih Graz", kosten: "€ 600", priority: 'yellow' }
    ],
    xlarge: [
      { item: "Sicherheitszäune", menge: "50", einheit: "Meter", lieferant: "Absperrtechnik", kosten: "€ 300", priority: 'red' },
      { item: "Notausgang-Schilder", menge: "6", einheit: "Stück", lieferant: "Sicherheit Plus", kosten: "€ 60", priority: 'red' }
    ]
  };
  
  return resources[visitorCount] || [];
}

function generateRandomNames(count: number): string[] {
  const names = [
    "Maria Huber", "Johann Steiner", "Franz Wimmer", "Peter Maier", 
    "Klaus Weber", "Anna Schmidt", "Lisa Bauer", "Stefan Müller",
    "Ingrid Hofbauer", "Georg Pichler", "Monika Gruber", "Thomas Eder"
  ];
  
  const shuffled = names.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateShifts(festivalData: FestivalData) {
  const shifts = [];
  const startDate = new Date(festivalData.startDate);
  const endDate = festivalData.endDate ? new Date(festivalData.endDate) : startDate;
  
  // Generate shifts for each day
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayName = currentDate.toLocaleDateString('de-AT', { weekday: 'short' });
    
    // Morning shift
    shifts.push({
      name: `${dayName} Vormittag`,
      start_date: currentDate.toISOString().split('T')[0],
      start_time: '09:00:00',
      end_time: '13:00:00'
    });
    
    // Afternoon shift
    shifts.push({
      name: `${dayName} Nachmittag`,
      start_date: currentDate.toISOString().split('T')[0],
      start_time: '13:00:00',
      end_time: '17:00:00'
    });
    
    // Evening shift
    shifts.push({
      name: `${dayName} Abend`,
      start_date: currentDate.toISOString().split('T')[0],
      start_time: '17:00:00',
      end_time: '22:00:00'
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return shifts;
}

function generateShiftStations(festivalData: FestivalData) {
  const baseStations = [
    { name: "Kassa", required_people: 2, description: "Eingangsbereich und Zahlungsabwicklung" },
    { name: "Ausschank", required_people: 2, description: "Getränkeausgabe" },
    { name: "Grill", required_people: 3, description: "Essensausgabe und Grillstation" }
  ];
  
  const festivalStations = getFestivalSpecificShiftStations(festivalData.type);
  const visitorStations = getVisitorSpecificShiftStations(festivalData.visitorCount);
  
  return [...baseStations, ...festivalStations, ...visitorStations];
}

function getFestivalSpecificShiftStations(type: string) {
  const stations: { [key: string]: any[] } = {
    feuerwehr: [
      { name: "Feuerwehrshow", required_people: 4, description: "Präsentation der Feuerwehraktivitäten" }
    ],
    musik: [
      { name: "Bühne/Technik", required_people: 3, description: "Tontechnik und Bühnenverwaltung" },
      { name: "Einlass", required_people: 2, description: "Ticketkontrolle und Einlass" }
    ],
    kirtag: [
      { name: "Karussell", required_people: 2, description: "Betreuung der Fahrgeschäfte" },
      { name: "Tombola", required_people: 2, description: "Losverkauf und Preisausgabe" }
    ],
    wein: [
      { name: "Weinverkostung", required_people: 3, description: "Weinberatung und -verkauf" }
    ],
    weihnachten: [
      { name: "Glühweinstand", required_people: 2, description: "Glühwein und warme Getränke" },
      { name: "Kekse & Süßes", required_people: 1, description: "Verkauf von Süßwaren" }
    ]
  };
  
  return stations[type] || [];
}

function getVisitorSpecificShiftStations(visitorCount: string) {
  const stations: { [key: string]: any[] } = {
    large: [
      { name: "Parkplatz", required_people: 2, description: "Parkplatzeinweisung" }
    ],
    xlarge: [
      { name: "Sicherheit", required_people: 4, description: "Sicherheitsdienst und Ordnung" },
      { name: "Erste Hilfe", required_people: 2, description: "Sanitätsdienst" }
    ]
  };
  
  return stations[visitorCount] || [];
}