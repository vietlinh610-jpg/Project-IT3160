let algorithmSelect = document.getElementById("algorithmSelect");

const roleToggle = document.getElementById("roleToggle");
const guestControls = document.getElementById("guestControls");
const adminControls = document.getElementById("adminControls");
const appHeader = document.getElementById('appHeader'); 

const trafficInput = document.getElementById("trafficLevel");

const floodInput = document.getElementById("floodLevel");

const obstacleRadiusInput = document.getElementById("obstacleRadius");

const googleIcon = L.icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", // icon giống trên gg map
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});
const placeSearchInput = document.getElementById('placeSearchInput');
const placeSearchButton = document.getElementById('placeSearchButton'); 
const searchResultsContainer = document.getElementById('searchResults');
let tempSearchMarker = null;
const placeObstacleBtn = document.getElementById("placeObstacleBtn");
