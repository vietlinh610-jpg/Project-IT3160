// Kh?i t?o app v? bind c?c s? ki?n ch?nh.

function initApp() {
  loadMoscowBoundary();
  drawMoscowMetroNetwork();
}

/*----------------------------------- Hi?n ???ng ?i tr?n b?n ?? --------------------------------*/
document.getElementById("togglePaths").addEventListener("click", () => {
  if (selectedPoints.length === 2){
    findAndDrawPath();
  }
});

function getAlgorithm() {
  if (typeof guestPathGroup !== 'undefined' && guestPathGroup) {
      guestPathGroup.clearLayers();
      map.removeLayer(guestPathGroup);
      guestPathGroup = null;
  }
  findAndDrawPath();
}

// ----------------------------------- X? l? thu?t to?n ------------------------------
algorithmSelect.addEventListener("change", function () {
    algorithm = this.value;
    if(selectedPoints.length === 2){
      const mapCenter = map.getCenter();

      L.popup({
              className: 'info-leaflet-popup synced-leaflet-popup compact-point-popup',
              autoClose: true,
              closeOnClick: true,
          })
          .setLatLng(mapCenter)
          .setContent(`Đã chọn thuật toán: <b>${algorithm}</b>.<br>Đang làm mới đường đi`)
          .openOn(map);

      setTimeout(() => {
          map.closePopup();
      }, 2000);

      getAlgorithm();
    }
});

initApp();
