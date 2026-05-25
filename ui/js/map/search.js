
placeSearchButton.addEventListener('click', async function() { 
  const query = placeSearchInput.value.trim();
  if (query.length < 3) {
      map.closePopup(); 
      L.popup({
          className: 'warning-leaflet-popup synced-leaflet-popup compact-point-popup',
          autoClose: true,
          closeOnClick: true
      })
      .setLatLng(map.getCenter()) 
      .setContent("<b>Cảnh báo:</b> Vui lòng nhập ít nhất 3 ký tự để tìm kiếm.")
      .openOn(map);

      setTimeout(() => {
          const currentPopup = map._popup;
          if (currentPopup && currentPopup.getContent().includes("Vui lòng nhập ít nhất 3 ký tự")) {
              map.closePopup();
          }
      }, 3000); 
      return;
  }

  if (tempSearchMarker) { 
      map.removeLayer(tempSearchMarker);
      tempSearchMarker = null;
  }
  searchResultsContainer.innerHTML = 'Đang tìm kiếm...'; 

  try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=ru&viewbox=37.3,55.5,37.9,55.9&bounded=1`);

      if (!response.ok) {
          throw new Error(`Lỗi API: ${response.status}`);
      }
      const data = await response.json();
      searchResultsContainer.innerHTML = ''; 

      if (data && data.length > 0) {
        let resultsFound = 0;

        data.forEach(place => {
            const lat = parseFloat(place.lat);
            const lon = parseFloat(place.lon);
            const searchedLatLng = L.latLng(lat, lon);
        
            let isPlaceInsideBoundary = true;
            if (moscowBoundaryLatLngs) {
                try {
                    isPlaceInsideBoundary = isPointInPolygon(searchedLatLng, moscowBoundaryLatLngs);
                } catch (error) {
                    console.error("Lỗi khi kiểm tra ranh giới cho địa điểm tìm kiếm:", error);
                }
            }
        
            if (!isPlaceInsideBoundary) return; 
        
            resultsFound++;
        
            const item = document.createElement('div');
            item.classList.add('search-result-item');
        
            const parts = place.display_name.split(',').map(p => p.trim());
            if (parts.length > 2) {
                parts.splice(-2, 2);
            }
            item.textContent = parts.join(', ');
        
            item.onclick = function() {
                const shortDisplayName = place.display_name.split(',')[0];
        
                if (tempSearchMarker) {
                    map.removeLayer(tempSearchMarker);
                }
        
                const popupContent = `<b>${shortDisplayName}</b><br><button class="btn btn-primary btn-xs" onclick="window.selectSearchedLocation(${lat}, ${lon})">Chọn điểm này</button>`;
        
                tempSearchMarker = L.marker([lat, lon]).addTo(map)
                                      .bindPopup(popupContent)
                                      .openPopup();
        
                map.setView([lat, lon], 17);
                searchResultsContainer.innerHTML = '';
                placeSearchInput.value = shortDisplayName;
            };
        
            searchResultsContainer.appendChild(item);
        });
        
        if (resultsFound === 0) {
            searchResultsContainer.innerHTML = '<div class="search-result-item">Không tìm thấy địa điểm phù hợp trong khu vực tàu điện ngầm Moscow.</div>';
        }
        
      } else {
          searchResultsContainer.innerHTML = '<div class="search-result-item">Không tìm thấy địa điểm.</div>';
      }
  } catch (error) {
      console.error('Lỗi tìm kiếm địa điểm:', error);
      map.closePopup();
      L.popup({
          className: 'error-leaflet-popup synced-leaflet-popup compact-point-popup',
          autoClose: true,
          closeOnClick: true
      })
      .setLatLng(map.getCenter())
      .setContent("<b>Lỗi:</b> Có lỗi xảy ra khi tìm kiếm địa điểm. Vui lòng thử lại.")
      .openOn(map);
      searchResultsContainer.innerHTML = '<div class="search-result-item">Lỗi khi tìm kiếm.</div>';
  }
});

placeSearchInput.addEventListener('keypress', function(e) {
if (e.key === 'Enter') {
    placeSearchButton.click(); 
}
});

// Sửa đổi map.on("click") để sử dụng hàm mới
