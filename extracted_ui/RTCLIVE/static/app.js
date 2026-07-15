const map = L.map('map', { zoomControl: false }).setView([17.6745, 83.2135], 13);
L.control.zoom({ position: 'topright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

let staticPins = [];
let dynamicPins = [];
let structuralLine = null; // Single road path
let userLoc = { lat: 17.6745, lng: 83.2135 }; 
let currentTransportMode = 'foot'; 

const createIcon = (cls, col) => L.divIcon({
    html: `<div style="display:flex; justify-content:center; align-items:center; width:38px; height:38px; background:white; border:3px solid ${col}; border-radius:50%; box-shadow:0 4px 8px rgba(0,0,0,0.3);"><i class="${cls}" style="color:${col};"></i></div>`,
    className: 'custom-icon', iconSize: [38, 38], iconAnchor: [19, 19]
});

const userPin = createIcon("fa-solid fa-street-view", "#111");
const stationPin = createIcon("fa-solid fa-location-dot", "#666");

function getBusIcon(serviceType) {
    let color = "#E31E24"; // Red (City Ordinary)
    if (serviceType.includes("Metro Express")) color = "#0087FF"; // Blue
    if (serviceType.includes("Metro Luxury")) color = "#00B140"; // Green
    return createIcon("fa-solid fa-bus", color);
}

function clearDynamicLayer() {
    dynamicPins.forEach(pin => map.removeLayer(pin));
    dynamicPins = [];
    if(structuralLine) map.removeLayer(structuralLine);
}

function openSlidePanel(panelId, btn) {
    document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');
    btn.classList.add('active');
    if (panelId === 'near-me-panel') runNearMe();
}

// === NEAR ME: Exclusive Route Drawing ===
function setTransportMode(mode, btn) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTransportMode = mode;
    if(structuralLine) map.removeLayer(structuralLine); // Clear route on mode switch
}

function runNearMe() {
    navigator.geolocation.getCurrentPosition(pos => {
        userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        fetchNearMe();
    }, () => fetchNearMe()); 
}

function fetchNearMe() {
    fetch(`/api/stops/near?lat=${userLoc.lat}&lng=${userLoc.lng}`).then(r => r.json()).then(data => {
        const results = document.getElementById('near-me-results');
        results.innerHTML = "";
        
        staticPins.forEach(p => map.removeLayer(p));
        staticPins = [];
        clearDynamicLayer();
        
        staticPins.push(L.marker([userLoc.lat, userLoc.lng], {icon: userPin}).addTo(map));

        data.forEach(stop => {
            results.innerHTML += `
                <div class="slide-card-item" onclick="drawRealRoadLine(${stop.latitude}, ${stop.longitude})" style="cursor:pointer; display:block;">
                    <h4 style="margin-bottom:4px;">${stop.stop_name}</h4>
                    <p style="font-size:0.8rem; color:gray;"><i class="fa-solid fa-location-arrow"></i> Click to see route via ${currentTransportMode}</p>
                </div>`;
            staticPins.push(L.marker([stop.latitude, stop.longitude], {icon: stationPin}).addTo(map));
        });
        map.setView([userLoc.lat, userLoc.lng], 14);
    });
}

async function drawRealRoadLine(endLat, endLng) {
    // 1. CLEAR previous dark line exclusively
    if(structuralLine) map.removeLayer(structuralLine);
    
    // 2. FETCH real road geometries
    const res = await fetch(`https://router.project-osrm.org/route/v1/${currentTransportMode}/${userLoc.lng},${userLoc.lat};${endLng},${endLat}?overview=full&geometries=geojson`);
    const data = await res.json();
    
    if(data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        const etaMins = Math.round(data.routes[0].duration / 60);
        
        // 3. DRAW new dark line
        structuralLine = L.polyline(coords, {color: '#111', weight: 6, opacity: 0.85}).addTo(map);
        map.fitBounds(structuralLine.getBounds(), { padding: [50, 50] });
        
        L.popup({closeButton: false, offset: [0, -15]})
         .setLatLng([endLat, endLng])
         .setContent(`<b style="color:var(--rtc-red);">${etaMins} mins</b>`)
         .openOn(map);
    }
}

// === ROUTES: 3 Input Search ===
function executeRouteSearch() {
    const origin = document.getElementById('from-stop-input').value;
    const dest = document.getElementById('to-stop-input').value;
    const bType = document.getElementById('bus-type-input').value;
    const container = document.getElementById('between-results');
    
    fetch(`/api/buses/between?origin=${origin}&dest=${dest}&type=${bType}`).then(r => r.json()).then(buses => {
        clearDynamicLayer();
        container.innerHTML = "";
        if (buses.length === 0) { container.innerHTML = `<p class="panel-desc">No buses matching criteria.</p>`; return; }

        const bounds = [];
        buses.forEach(bus => {
            let col = bus.service_type.includes("Ordinary") ? "var(--rtc-red)" : (bus.service_type.includes("Express") ? "#0087FF" : "#00B140");
            
            container.innerHTML += `
                <div class="slide-card-item" style="border-left:4px solid ${col};">
                    <div class="card-meta">
                        <h4>Route ${bus.route_id}</h4>
                        <p style="color:${col}; font-weight:bold;">${bus.service_type}</p>
                    </div>
                    <div class="badge-eta">ETA: ${bus.eta} min</div>
                </div>`;
                
            dynamicPins.push(L.marker([bus.live_lat, bus.live_lng], {icon: getBusIcon(bus.service_type)}).addTo(map).bindPopup(`Route ${bus.route_id}`));
            bounds.push([bus.live_lat, bus.live_lng]);
        });
        if(bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
    });
}

// === LIVE TRACKING: High Level Visuals ===
function searchRouteVariants() {
    const routeId = document.getElementById('target-route-id').value;
    const panel = document.getElementById('route-variants-panel');
    document.getElementById('live-tracking-data-panel').innerHTML = ""; 
    
    fetch(`/api/route/variants/${routeId}`).then(r => r.json()).then(variants => {
        if(variants.error) { panel.innerHTML = `<p style="color:red;">${variants.error}</p>`; return; }
        
        panel.innerHTML = `<h4>Select Vehicle to Track:</h4>`;
        variants.forEach(v => {
            let col = v.service_type.includes("Ordinary") ? "var(--rtc-red)" : (v.service_type.includes("Express") ? "#0087FF" : "#00B140");
            panel.innerHTML += `
                <div class="slide-card-item" onclick="fetchLiveTrack('${v.vehicle_id}')" style="cursor:pointer; border-left:4px solid ${col};">
                    <div class="card-meta"><h4>To ${v.destination}</h4><p>${v.service_type}</p></div>
                    <i class="fa-solid fa-satellite-dish" style="color:${col}"></i>
                </div>`;
        });
    });
}

function fetchLiveTrack(vehicleId) {
    const panel = document.getElementById('live-tracking-data-panel');
    document.getElementById('route-variants-panel').innerHTML = ""; 
    
    fetch(`/api/track/vehicle/${vehicleId}`).then(r => r.json()).then(data => {
        clearDynamicLayer();
        
        if (data.path.length > 1) {
            let coordsStr = data.path.map(s => `${s.lng},${s.lat}`).join(';');
            fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`)
                .then(r => r.json()).then(routeData => {
                    if(routeData.routes) {
                        const rCoords = routeData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                        structuralLine = L.polyline(rCoords, { color: '#111', weight: 5 }).addTo(map);
                        map.fitBounds(structuralLine.getBounds(), { padding: [40, 40] });
                    }
                });
        }

        data.path.forEach(stop => dynamicPins.push(L.circleMarker([stop.lat, stop.lng], { radius: 6, color: '#111', fillColor: '#fff', fillOpacity: 1 }).addTo(map).bindPopup(stop.stop_name)));
        dynamicPins.push(L.marker([data.vehicle.lat, data.vehicle.lng], {icon: getBusIcon(data.vehicle.type)}).addTo(map).bindPopup(`Live Status`).openPopup());

        // Smart Crowdness Visualization Logic
        let cLevel = data.vehicle.crowdness;
        let cColor = cLevel === 'High' ? 'var(--rtc-red)' : (cLevel === 'Medium' ? '#f39c12' : '#27ae60');
        let cWidth = cLevel === 'High' ? '90%' : (cLevel === 'Medium' ? '50%' : '20%');
        
        let adviceHtml = '';
        if (cLevel === 'High') {
             adviceHtml = `
             <div class="smart-advice-box">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:1.5rem; color:var(--rtc-red);"></i>
                <div>
                    <strong>Highly Overcrowded</strong>
                    <p style="font-size:0.8rem; margin-top:2px;">We recommend waiting for the next bus arriving in <b>${data.vehicle.next_bus}</b>.</p>
                </div>
             </div>`;
        }

        let timelineHTML = `<div class="route-timeline">`;
        data.path.forEach(stop => {
            const isNext = stop.stop_name.includes(data.vehicle.next_stop);
            timelineHTML += `
                <div class="timeline-stop ${isNext ? 'active-stop' : ''}">
                    <h4>${stop.stop_name}</h4>
                    ${isNext ? `<p style="color:var(--rtc-red); font-weight:bold;">Bus is approaching...</p>` : ''}
                </div>`;
        });
        timelineHTML += `</div>`;

        panel.innerHTML = `
            <div class="telemetry-dashboard">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="font-weight:bold;">${data.vehicle.type}</span>
                    <span style="color:${cColor}; font-weight:bold;">${cLevel} Capacity</span>
                </div>
                <div class="crowd-meter-bg"><div class="crowd-meter-fill" style="width:${cWidth}; background:${cColor};"></div></div>
            </div>
            ${adviceHtml}
            ${timelineHTML}
        `;
    });
}

window.onload = runNearMe;