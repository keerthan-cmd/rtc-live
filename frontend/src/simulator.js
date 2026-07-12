import { database, ref, set } from './firebase.js';
import { ROUTES } from './routes.js';

// Interpolate between points to make smooth movement
function getInterpolatedPoint(p1, p2, fraction) {
  return [
    p1[0] + (p2[0] - p1[0]) * fraction,
    p1[1] + (p2[1] - p1[1]) * fraction
  ];
}

const buses = [
  { id: '38Y', routeId: '38Y', segment: 0, fraction: 0, speed: 0.05, dir: 1 },
  { id: '400K', routeId: '400K', segment: 2, fraction: 0.5, speed: 0.04, dir: -1 },
  { id: '28Z', routeId: '28Z', segment: 1, fraction: 0.2, speed: 0.06, dir: 1 }
];

console.log("Starting RTC Live Simulator...");

setInterval(() => {
  buses.forEach(bus => {
    const routePath = ROUTES[bus.routeId];
    
    // Update fraction
    bus.fraction += bus.speed * bus.dir;

    if (bus.fraction >= 1) {
      bus.fraction = 0;
      bus.segment += 1;
      if (bus.segment >= routePath.length - 1) {
        bus.segment = routePath.length - 2;
        bus.fraction = 1;
        bus.dir = -1; // turnaround
      }
    } else if (bus.fraction <= 0) {
      bus.fraction = 1;
      bus.segment -= 1;
      if (bus.segment < 0) {
        bus.segment = 0;
        bus.fraction = 0;
        bus.dir = 1; // turnaround
      }
    }

    const p1 = routePath[bus.segment];
    const p2 = routePath[bus.segment + 1];
    const currentLoc = getInterpolatedPoint(p1, p2, bus.fraction);

    // Write to Firebase
    set(ref(database, `buses/${bus.id}`), {
      lat: currentLoc[0],
      lng: currentLoc[1],
      lastUpdated: Date.now(),
      status: bus.dir === 1 ? "Inbound" : "Outbound"
    });
  });
  process.stdout.write(".");
}, 2000); // Update every 2 seconds
