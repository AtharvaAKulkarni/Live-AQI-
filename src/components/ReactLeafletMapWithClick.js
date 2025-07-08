import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import "leaflet.heat";
// Default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onMapClick(lat, lng);
    }
  });
  return null;
}

function CenterMap({ center }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

const ReactLeafletMapWithClick = () => {

  const defaultPosition = [19.0760, 72.8777]; // Mumbai as fallback
  const [mapCenter, setMapCenter] = useState(defaultPosition);
  const [clickedPosition, setClickedPosition] = useState(null);
  const [aqiData, setAqiData] = useState([]);
  const [locationInputs, setLocationInputs] = useState({
    city: '',
    state: '',
    country: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentLayer, setCurrentLayer] = useState('none');

  function HeatLayerManager({ currentLayer }) {
    const map = useMap();
    useEffect(() => {
      let heatLayer;
      async function loadHeatLayer() {
        const heatData = await fetchLayerData(currentLayer);
        if (heatData && map && currentLayer !== "none") {
          heatLayer = L.heatLayer(heatData, {
            radius: 24,
            blur: 5,
            maxZoom: 17,
            gradient: {
              0.0: "#00e400",   // Green (Good)
              0.2: "#ffff00",   // Yellow (Satisfactory)
              0.4: "#ff7e00",   // Orange (Moderate)
              0.5: "#00ffff",   // Cyan (Midpoint, custom)
              0.6: "#ff0000",   // Red (Poor)
              0.8: "#8f3f97",   // Purple (Very Poor)
              1.0: "#7e0023"    // Mar
            },
          }).addTo(map);
        }
      }
      loadHeatLayer();
      return () => {
        if (heatLayer && map && currentLayer === "none") map.removeLayer(heatLayer);
      };
    }, [currentLayer, map]);
    return null;
  }
  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          setClickedPosition([latitude, longitude]);
          fetchAqiData(latitude, longitude);
          setIsLoading(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setIsLoading(false);
        }
      );
    }
  }, []);

  const fetchLayerData = async (pollutant_id) => {
    
    try {
      const res = await axios.get(`http://localhost:5000/layer/data/${pollutant_id}`)
      return res.data.response;
    } catch (error) {
      console.log("error in fetching layer data", error)

    }
  }

  const fetchAqiData = async (lat, lng) => {
    try {
      const response = await axios.get(`http://localhost:5000/aqi?lat=${lat}&lng=${lng}`);

      setAqiData(response.data.data || []);

    } catch (error) {
      if (error.status == 404) {
        console.log("No nearby AQI station found.")
        alert("No nearby AQI station found.")
      }
      console.error(error);

    }
  };

  const handleMapClick = async (lat, lng) => {
    setClickedPosition([lat, lng]);
    setMapCenter([lat, lng]);
    setIsLoading(true);
    await fetchAqiData(lat, lng).then(setIsLoading(false));
  };

  const handleLocationInputChange = (e) => {
    const { name, value } = e.target;
    setLocationInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleGetAqiByLocation = async () => {
    setIsLoading(true);
    const location = `${locationInputs.city},${locationInputs.state},${locationInputs.country}`;
    try {
      const locationRes = await axios.get(`http://localhost:5000/location`, {
        params: { location }
      });

      const { lat, lng } = locationRes.data;
      setClickedPosition([lat, lng]);
      setMapCenter([lat, lng]);
      await fetchAqiData(lat, lng);
    } catch (error) {
      console.error('Error during location-based AQI fetch:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#0e0e0e',
      color: '#fff',
      minHeight: '100vh',
      paddingBottom: '50px',
      margin: 0,
      paddingTop: 0
    }}>
      <h2 style={{
        textAlign: 'center',
        padding: '20px 0',
        color: '#fff',
        marginTop: 0
      }}>
        🌍 Real-Time AQI Monitor
      </h2>

      {isLoading && (
        <div style={{ textAlign: 'center', color: '#009879', margin: '10px 0' }}>
          Loading location and AQI data...
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <input
          type="text"
          name="country"
          placeholder="Country"
          value={locationInputs.country}
          onChange={handleLocationInputChange}
          style={{ marginRight: '10px', padding: '8px', backgroundColor: '#222', color: '#fff', border: '1px solid #444' }}
        />
        <input
          type="text"
          name="state"
          placeholder="State"
          value={locationInputs.state}
          onChange={handleLocationInputChange}
          style={{ marginRight: '10px', padding: '8px', backgroundColor: '#222', color: '#fff', border: '1px solid #444' }}
        />
        <input
          type="text"
          name="city"
          placeholder="City"
          value={locationInputs.city}
          onChange={handleLocationInputChange}
          style={{ marginRight: '10px', padding: '8px', backgroundColor: '#222', color: '#fff', border: '1px solid #444' }}
        />
        <button
          onClick={handleGetAqiByLocation}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#009879',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Loading...' : 'Get AQI'}
        </button>
      </div>

      <div style={{ height: '400px', width: '80%', margin: '0 auto', borderRadius: '10px', overflow: 'hidden' }}>
        <MapContainer
          center={mapCenter}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <HeatLayerManager currentLayer={currentLayer} />
          <CenterMap center={mapCenter} />
          <MapClickHandler onMapClick={handleMapClick} />
          {clickedPosition && (
            <Marker position={clickedPosition}>
              <Popup>
                <div style={{ color: '#333' }}>
                  <strong>Selected Location</strong> <br />
                  Lat: {clickedPosition[0].toFixed(4)}, Lng: {clickedPosition[1].toFixed(4)}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      <div className='layer-container' style={{ height: "20px", marginTop: "5px", }}>
        choose a layer
        <div className='layer-selection' style={{ display: 'flex', justifyContent: "center", alignContent: "space-between" }}>

          <button className='layer-option' key="none" onClick={() => { setCurrentLayer("none") }} style={{

          }}>
            None
          </button>
          <button className='layer-option' key="NO2" onClick={() => { setCurrentLayer("NO2") }}>
            NO2
          </button>
          <button className='layer-option' key="PM10" onClick={() => { setCurrentLayer("PM10") }}>
            PM10
          </button>
          <button className='layer-option' key="PM2.5" onClick={() => { setCurrentLayer("PM2.5") }}>
            PM2.5
          </button>
          <button className='layer-option' key="SO2" onClick={() => { setCurrentLayer("SO2") }}>
            SO2
          </button>
          <button className='layer-option' key="CO" onClick={() => { setCurrentLayer("CO") }}>
            CO
          </button>
          <button className='layer-option' key="OZONE" onClick={() => { setCurrentLayer("OZONE") }}>
            O3
          </button>
          <button className='layer-option' key="NH3" onClick={() => { setCurrentLayer("NH3") }}>
            NH3
          </button>
        </div>
      </div>
      {aqiData.length > 0 && (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '35px auto' }}>
          <h2 style={{ textAlign: 'center', marginTop: "35px", marginBottom: '20px', color: '#fff' }}>AQI Data</h2>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#1e1e1e',
            color: '#fff',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#009879', color: '#ffffff' }}>
                <th style={{ padding: '12px' }}>Pollutant</th>
                <th style={{ padding: '12px' }}>Value</th>
                <th style={{ padding: '12px' }}>Unit</th>
                <th style={{ padding: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {aqiData.map((item, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#2c2c2c' : '#1e1e1e' }}>
                  <td style={{ padding: '12px' }}>{item.pollutant.toUpperCase()}</td>
                  <td style={{ padding: '12px' }}>{item.value}</td>
                  <td style={{ padding: '12px' }}>{item.unit}</td>
                  <td style={{
                    padding: '12px',
                    color: item.value > 100 ? '#ff5555' : item.value > 50 ? '#ffaa44' : '#55ff55',
                    fontWeight: 'bold'
                  }}>
                    {item.value > 100 ? 'Poor' : item.value > 50 ? 'Moderate' : 'Good'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReactLeafletMapWithClick;