const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors({origin:"*",
    
}));
const API_KEY = '579b464db66ec23bdd000001d0ea578f537a4fe148b4375ba5ac1399';
app.get('/aqi', async (req, res)=>{
    try{
        const {country, state, city}=req.query;
        const query=`https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key=${API_KEY}&format=json&limit=10&filters%5Bcountry%5D=${country}&filters%5Bstate%5D=${state}&filters%5Bcity%5D=${city}`
        console.log(query)
        const response= await axios.get(query)
        console.log(response.data);
        return res.json(response.data);
    }
    catch(error){
        console.error(error);
    }
})
app.get('/aqi-coord', async (req, res)=>{
    try{
        const {latitude, longitude}=req.query;
        console.log(latitude,longitude)
        const query=`https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key=${API_KEY}&format=json&limit=10&filters%5Bcountry%5D=${country}&filters%5Bstate%5D=${state}&filters%5Bcity%5D=${city}`
        console.log(query)
        const response= await axios.get(query)
        console.log(response.data);
        return res.json(response.data);
    }
    catch(error){
        console.error(error);
    }
})

app.listen(5000, ()=>{
    console.log('Server running on http://localhost:5001');
})