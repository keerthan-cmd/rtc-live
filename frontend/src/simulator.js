import { database, ref, set } from './firebase.js';
import STOPS_DATA from './data/stops.json' assert { type: "json" };
import ROUTES_DATA from './data/routes_data.json' assert { type: "json" };

// Interpolate between points to make smooth movement
function getInterpolatedPoint(p1, p2, fraction) {
  return [
    p1[0] + (p2[0] - p1[0]) * fraction,
    p1[1] + (p2[1] - p1[1]) * fraction
  ];
}

// Select a random sample of routes to simulate traffic
const allRouteIds = Object.keys(ROUTES_DATA);
const sampleSize = Math.min(15, allRouteIds.length); // 15 random buses
const selectedRoutes = [];

for (let i = 0; i < sampleSize; i++) {
  const rId = allRouteIds[Math.floor(Math.random() * allRouteIds.length)];
  selectedRoutes.push(rId);
}

const buses = selectedRoutes.map((rId, index) => {
  return {
    id: `${rId}-${index}`, 
    routeId: rId,
    segment: 0,
    fraction: Math.random(),
    speed: 0.03 + (Math.random() * 0.05),
    dir: Math.random() > 0.5 ? 1 : -1
  }
});

console.log(`Starting RTC Live Simulator with ${buses.length} active buses...`);

setInterval(() => {
  buses.forEach(bus => {
    const stopNames = ROUTES_DATA[bus.routeId];
    if (!stopNames || stopNames.length < 2) return;
    
    // Map stop names to coordinates
    const routePath = stopNames.map(name => STOPS_DATA[name]).filter(Boolean);
    if (routePath.length < 2) return;

    bus.fraction += bus.speed * bus.dir;

    if (bus.fraction >= 1) {
      bus.fraction = 0;
      bus.segment += bus.dir;
      if (bus.segment >= routePath.length - 1) {
        bus.segment = routePath.length - 2;
        bus.fraction = 1;
        bus.dir = -1; // turnaround
      }
    } else if (bus.fraction <= 0) {
      bus.fraction = 1;
      bus.segment += bus.dir;
      if (bus.segment < 0) {
        bus.segment = 0;
        bus.fraction = 0;
        bus.dir = 1; // turnaround
      }
    }

    const p1 = routePath[bus.segment];
    const p2 = routePath[bus.segment + 1];
    
    if (p1 && p2) {
      const currentLoc = getInterpolatedPoint(p1, p2, bus.fraction);
      // Write to Firebase
      set(ref(database, `buses/${bus.id}`), {
        lat: currentLoc[0],
        lng: currentLoc[1],
        lastUpdated: Date.now(),
        status: bus.dir === 1 ? "Inbound" : "Outbound",
        routeId: bus.routeId,
        speed: bus.speed,
        dir: bus.dir
      });
    }
  });
  process.stdout.write(".");
}, 2000); // Update every 2 seconds
