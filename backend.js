// // server.js
// const express = require('express');
// const axios = require('axios');
// const cors = require('cors');
// const app = express();
// app.use(cors());

// app.get('/aqi', async (req, res) => {
//     const { lat, lng } = req.query;
//     console.log('Received request for AQI at:', lat, lng);

//     try {
//         const response = await axios.get(
//             `https://api.openaq.org/v3/locations?coordinates=${lat},${lng}&radius=12000&limit=1`,
//             {
//                 headers: {
//                     'X-API-Key': '76596f51f138009bbb3d66626e9deca250498f9ea7c647e7875e30a02d334e7f',
//                 }
//             }
//         );
//         const id = response.data.results[0].id;
//         const aqi = await axios.get(
//             `https://api.openaq.org/v3/locations/${id}/latest`,
//             {
//                 headers: {
//                     'X-API-Key': '76596f51f138009bbb3d66626e9deca250498f9ea7c647e7875e30a02d334e7f',
//                 }
//             }
//         );
//         console.log(aqi.data);
//         res.json(aqi.data);
//     } catch (err) {
//         console.error('Error fetching data from OpenAQ:', err.response?.data || err.message || err);
//         res.status(500).json({ error: 'Failed to fetch AQI data' });
//     }
// });


// app.listen(5000, () => {
//     console.log('Server running on http://localhost:5000');
// });


// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));

const API_KEY = '76596f51f138009bbb3d66626e9deca250498f9ea7c647e7875e30a02d334e7f';
const divy_gov_api_key = "579b464db66ec23bdd00000164d06b61dce14b4e648e436ce62dbb41";

app.get('/aqi', async (req, res) => {
    const { lat, lng } = req.query;
    console.log('Received request for AQI at:', lat, lng);

    try {
        // Step 1: Get nearest location ID
        const locationRes = await axios.get(
            `https://api.openaq.org/v3/locations?coordinates=${lat},${lng}&radius=12000&limit=1`,
            {
                headers: { 'X-API-Key': API_KEY }
            }
        );
        const locationId = locationRes.data.results[0]?.id;
        console.log(locationId)
        if (!locationId) return res.status(404).json({ error: 'No nearby AQI station found.' });

        // Step 2: Get latest sensor data for that location
        const latestRes = await axios.get(
            `https://api.openaq.org/v3/locations/${locationId}/latest`,
            {
                headers: { 'X-API-Key': API_KEY }
            }
        );
        const sensorData = latestRes.data?.results;
        // console.log(latestRes.data.results);
        if (!sensorData) return res.status(404).json({ error: 'No sensor data found for location.' });

        // Step 3: For each measurement, fetch sensor info to get parameter and unit
        const enrichedData = await Promise.all(
            sensorData.map(async (entry) => {
                try {
                    const sensorInfoRes = await axios.get(
                        `https://api.openaq.org/v3/sensors/${entry.sensorsId}`,
                        {
                            headers: { 'X-API-Key': API_KEY }
                        }
                    );
                    // console.log(sensorInfoRes.data);
                    const parameter = sensorInfoRes.data?.results?.[0]?.parameter?.name;
                    const unit = sensorInfoRes.data?.results?.[0]?.parameter?.units;
                    return {
                        pollutant: parameter,
                        value: entry.value,
                        unit: unit,
                        sensorId: entry.sensorsId
                    };
                } catch (err) {
                    console.warn(`Failed to fetch sensor info for sensorId ${entry.sensorId}`);
                    return null;
                }
            })
        );

        const finalData = enrichedData.filter(Boolean);
        const uniqueHighest = {};
        for (const entry of finalData) {
            const key = entry.pollutant;
            if (!uniqueHighest[key] || entry.value > uniqueHighest[key].value) {
                uniqueHighest[key] = entry;
            }
        }

        const filteredFinalData = Object.values(uniqueHighest);
        console.log(filteredFinalData)
        res.json({ data: filteredFinalData });

    } catch (err) {
        console.error('Error fetching data from OpenAQ:', err.response?.data || err.message || err);
        res.status(500).json({ error: 'Failed to fetch AQI data' });
    }
});
app.get('/location', async (req, res) => {
    const location = req.query.location;
    const url = `http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=a4ab9ecefc617c4b2df36cf9943d970d`
    try {
        const response = await axios.get(url);
        const data = response.data[0];
        const lat = data.lat;
        const lng = data.lon;
        console.log(data)
        return res.json({ lat: lat, lng: lng })
    }
    catch (err) {
        console.error(err)
    }
})
app.get('/layer/data/:id', async (req, res) => {
    const PolId = req.params.id;
    const url = `https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key=${divy_gov_api_key}&offset=0&limit=1000&format=json&filters%5Bpollutant_id%5D=${PolId}`;
    try {
        const response = await axios.get(url)

        const filtered_response = response.data.records.filter((data) =>           
        data.latitude !== undefined &&
        data.longitude !== undefined &&
        data.min_value !== "NA" &&
        data.max_value !== "NA" &&
        data.avg_value !== "NA" &&
        data.pollutant_id !== undefined
        ).map((data)=>({
     latitude: parseFloat(data.latitude),
    longitude: parseFloat(data.longitude),
    intensity:(data.min_value + data.max_value + data.avg_value) / 3

    //  return [parseFloat(data.latitude), parseFloat(data.longitude), intensity];
}))
  

// console.log("After filter:", filtered_response.length);
// console.log("Before filter:", response.data.records.length);
//normalise intensities
const allintensities=filtered_response.map((data)=>
    {return data.intensity}
)
const maxIntensity = Math.max(...allintensities);
const minIntensity = Math.min(...allintensities);
const normalised_response=filtered_response.map((data)=>{
    const normalized = (data.intensity - minIntensity) / (maxIntensity - minIntensity);
    return[data.latitude,data.longitude,normalized]
})
         return res.json({ response: normalised_response})

    } catch (Error) {
        console.log("error finding layer data: \n", Error);
    }
})
app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});
