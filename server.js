const express = require('express');
const cors = require('cors');
const { OPENAI_API_KEY, WEATHER_API_KEY, DEFAULT_CITY } = require("./config");
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Untuk mem-parsing body JSON

// Fungsi untuk mendapatkan respons dari OpenAI API
async function getOpenAIResponse(message) {
  const postData = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: message }],
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: postData,
  });

  const data = await response.json();
  return data.choices[0]?.message?.content || "Maaf, tidak ada jawaban.";
}

// Fungsi untuk mendapatkan cuaca dari OpenWeather API
async function getWeather(city) {
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;

  const response = await fetch(apiUrl);
  const data = await response.json();

  return `Cuaca di ${data.name}: ${data.weather[0].description}, suhu ${data.main.temp}°C, kecepatan angin ${data.wind.speed} m/s.`;
}

// Endpoint untuk menerima pesan dari frontend
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Pesan tidak boleh kosong." });
  }

  if (message.toLowerCase().includes("cuaca")) {
    try {
      const weatherResponse = await getWeather(DEFAULT_CITY);
      return res.json({ response: weatherResponse });
    } catch (err) {
      return res.status(500).json({ error: "Gagal mengambil data cuaca." });
    }
  }

  try {
    const aiResponse = await getOpenAIResponse(message);
    return res.json({ response: aiResponse });
  } catch (err) {
    return res.status(500).json({ error: "Gagal memproses permintaan AI." });
  }
});

// Menjalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
