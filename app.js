// Scene, Camera, Renderer setup
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight - 150); // Subtract bottom details section height
document.getElementById('container').appendChild(renderer.domElement);

// Orbit controls for interactivity (zoom, rotate)
let controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;

// Add stars to the background
function addStars() {
    let starGeometry = new THREE.BufferGeometry();
    let starMaterial = new THREE.PointsMaterial({ color: 0xaaaaaa });

    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = -Math.random() * 2000;
        starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    let stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

// Raycaster and mouse for interaction
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedNEO = null;
let neoObjects = []; // Array to store NEO 3D objects for interaction

// Create the Sun with a glow effect
let sunGeometry = new THREE.SphereGeometry(1, 32, 32);
let sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
let sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Create a glow effect around the Sun
let sunGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00, 
    transparent: true, 
    opacity: 0.3,
    blending: THREE.AdditiveBlending
});
let sunGlowGeometry = new THREE.SphereGeometry(1.3, 32, 32);
let sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
scene.add(sunGlow);

// Create planet orbits
let createOrbit = (radius) => {
    let curve = new THREE.EllipseCurve(
        0, 0,            // ax, ay (center)
        radius, radius,   // xRadius, yRadius
        0, 2 * Math.PI,   // Start and end angles
        false,            // Clockwise
        0                 // Start rotation
    );
    let points = curve.getPoints(100);
    let orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    let orbitMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });
    let orbit = new THREE.Line(orbitGeometry, orbitMaterial);
    orbit.rotation.x = Math.PI / 2;  // Rotate to lie flat on the XY plane
    scene.add(orbit);
};

// Create planets (Mercury, Venus, Earth, Mars, Jupiter)
let planets = [
    { name: "Mercury", color: 0xaaaaaa, distance: 1.4, size: 0.2, speed: 0.02, angle: 0 },
    { name: "Venus", color: 0xffcc00, distance: 2, size: 0.4, speed: 0.015, angle: 0 },
    { name: "Earth", color: 0x0000ff, distance: 3, size: 0.5, speed: 0.01, angle: 0 },
    { name: "Mars", color: 0xff0000, distance: 4.5, size: 0.3, speed: 0.008, angle: 0 },
    { name: "Jupiter", color: 0xffaa00, distance: 6.5, size: 0.9, speed: 0.005, angle: 0 }
];

// Add planets to the scene and draw their orbits
planets.forEach(planet => {
    createOrbit(planet.distance);
    
    let planetGeometry = new THREE.SphereGeometry(planet.size, 32, 32);
    let planetMaterial = new THREE.MeshBasicMaterial({ color: planet.color });
    let planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    planetMesh.position.set(planet.distance, 0, 0);
    planetMesh.userData = { name: planet.name };  // Add name to userData for interaction
    scene.add(planetMesh);
    planet.mesh = planetMesh; // Store the mesh reference for animations
});

// Set initial camera position
camera.position.z = 10;

// Time variable to control the animation
let time = 0;

// Animate the scene (for continuous rendering)
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate the Sun
    sun.rotation.y += 0.005;
    sunGlow.rotation.y += 0.005;  // Rotate the glow effect too
    
    // Update the position of each planet along its orbit
    planets.forEach(planet => {
        planet.angle += planet.speed; // Increment the angle over time (controls speed)
        planet.mesh.position.x = Math.cos(planet.angle) * planet.distance;  // X position
        planet.mesh.position.z = Math.sin(planet.angle) * planet.distance;  // Z position
    });

    controls.update(); // Update controls for smooth camera movement
    renderer.render(scene, camera);
}
animate();

// NASA API key (replace 'YOUR_API_KEY' with your actual NASA API key)
const apiKey = 'm13833bsjWyegvDZ1CD7jmlC3QNoSx1y9dztlLfa';

// State for sorting
let sortState = {
    column: null,
    ascending: true
};

// Function to fetch NEO data from NASA's NEO API
async function fetchNEOData() {
    const response = await fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=2024-10-06&end_date=2024-10-06&api_key=${apiKey}`);
    const data = await response.json();
    return data.near_earth_objects['2024-10-06'];
}

// Function to populate NEO data into the table
function populateNEOTable(neoList) {
    const tableBody = document.getElementById('neo-table-body');
    tableBody.innerHTML = ''; // Clear the loading message or previous data

    neoList.forEach((neo, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-neo-index', index); // Store index for reference

        row.innerHTML = `
            <td>${neo.name}</td>
            <td>${parseFloat(neo.close_approach_data[0].miss_distance.kilometers).toLocaleString()}</td>
            <td>${parseFloat(neo.close_approach_data[0].relative_velocity.kilometers_per_hour).toLocaleString()}</td>
            <td>${neo.is_potentially_hazardous_asteroid ? 'Yes' : 'No'}</td>
        `;
        row.classList.add('fade-in'); // Apply fade-in animation

        row.addEventListener('click', () => focusOnNEO(index)); // Add event listener to focus on NEO

        tableBody.appendChild(row);
    });
}

// Fetch NEOs and display in the table
async function addNEOsToScene() {
    const neoList = await fetchNEOData();
    window.neoData = neoList; // Store NEO data globally for sorting
    populateNEOTable(neoList);
    createNEOObjects(neoList); // Create NEO objects in the scene
}

// Create NEO objects and store them for interaction
function createNEOObjects(neoList) {
    neoObjects = []; // Clear previous NEO objects
    neoList.forEach(neo => {
        let distance = neo.close_approach_data[0].miss_distance.kilometers / 1e6; // Scale distance for visibility
        let neoGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        let neoMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        let neoObject = new THREE.Mesh(neoGeometry, neoMaterial);
        neoObject.position.set(distance, 0, 0); // Position NEO based on miss distance
        neoObject.userData = neo; // Attach NEO data to the object
        scene.add(neoObject);
        neoObjects.push(neoObject); // Store for reference
    });
}

// Function to focus on a specific NEO object when clicked in the table
function focusOnNEO(index) {
    const selectedNEO = neoObjects[index];
    if (selectedNEO) {
        camera.position.set(selectedNEO.position.x, selectedNEO.position.y + 1, selectedNEO.position.z + 5);
        controls.target.set(selectedNEO.position.x, selectedNEO.position.y, selectedNEO.position.z);
        controls.update();
    }
}

// Function to sort the NEO data
function sortTable(column) {
    const tableBody = document.getElementById('neo-table-body');
    const nameHeader = document.getElementById('name-header');
    const missDistanceHeader = document.getElementById('miss-distance-header');
    const velocityHeader = document.getElementById('velocity-header');
    const hazardousHeader = document.getElementById('hazardous-header');

    // Reset active class and remove sorting arrows from all headers
    [nameHeader, missDistanceHeader, velocityHeader, hazardousHeader].forEach(header => {
        header.classList.remove('active', 'sort-asc', 'sort-desc');
    });

    // Set active class on the clicked column and toggle sorting order
    const activeHeader = document.getElementById(`${column}-header`);
    activeHeader.classList.add('active');
    if (sortState.column === column) {
        sortState.ascending = !sortState.ascending;
    } else {
        sortState.column = column;
        sortState.ascending = true;
    }
    activeHeader.classList.add(sortState.ascending ? 'sort-asc' : 'sort-desc');

    const sortedData = window.neoData.sort((a, b) => {
        let aValue, bValue;
        switch (column) {
            case 'name':
                aValue = a.name;
                bValue = b.name;
                break;
            case 'miss_distance':
                aValue = parseFloat(a.close_approach_data[0].miss_distance.kilometers);
                bValue = parseFloat(b.close_approach_data[0].miss_distance.kilometers);
                break;
            case 'velocity':
                aValue = parseFloat(a.close_approach_data[0].relative_velocity.kilometers_per_hour);
                bValue = parseFloat(b.close_approach_data[0].relative_velocity.kilometers_per_hour);
                break;
            case 'hazardous':
                aValue = a.is_potentially_hazardous_asteroid;
                bValue = b.is_potentially_hazardous_asteroid;
                break;
            default:
                return 0;
        }

        // Sort in ascending or descending order
        if (aValue < bValue) return sortState.ascending ? -1 : 1;
        if (aValue > bValue) return sortState.ascending ? 1 : -1;
        return 0;
    });

    populateNEOTable(sortedData);
    createNEOObjects(sortedData); // Re-create NEO objects based on the sorted order
}

// Add NEOs to the scene after fetching data
addNEOsToScene();

// Add stars to the background
addStars();

// Handle window resize (to adjust camera aspect ratio and renderer size)
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / (window.innerHeight - 150);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight - 150);
});
