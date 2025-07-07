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
app.use(cors());

const API_KEY = '76596f51f138009bbb3d66626e9deca250498f9ea7c647e7875e30a02d334e7f';

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
app.get('/location', async (req, res)=>{
    const location = req.query.location;
    const url=`http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=a4ab9ecefc617c4b2df36cf9943d970d`
    try {
        const response=await axios.get(url);
        const data=response.data[0];
        const lat=data.lat;
        const lng=data.lon;
        console.log(data)
        return res.json({lat:lat, lng:lng})
    }
    catch(err){
        console.error(err)
    }
})
app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});
