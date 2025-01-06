const http = require("http");
const https = require("https");
const { OPENAI_API_KEY, WEATHER_API_KEY, DEFAULT_CITY } = require("./config");

// Fungsi untuk mendapatkan respons dari OpenAI API
function getOpenAIResponse(message, callback) {
  const postData = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: message }],
  });

  const options = {
    hostname: "api.openai.com",
    path: "/v1/chat/completions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  const req = https.request(options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        const response = JSON.parse(data);
        const reply = response.choices[0]?.message?.content || "Maaf, tidak ada jawaban.";
        callback(null, reply);
      } catch (error) {
        callback(error, null);
      }
    });
  });

  req.on("error", (err) => {
    callback(err, null);
  });

  req.write(postData);
  req.end();
}

// Fungsi untuk mendapatkan cuaca dari Weather API
function getWeather(city, callback) {
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;

  https.get(apiUrl, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        const weather = JSON.parse(data);
        const responseMessage = `Cuaca di ${weather.name}: ${weather.weather[0].description}, suhu ${weather.main.temp}°C, kecepatan angin ${weather.wind.speed} m/s.`;
        callback(null, responseMessage);
      } catch (error) {
        callback(error, null);
      }
    });
  }).on("error", (err) => {
    callback(err, null);
  });
}

// Server HTTP
const server = http.createServer((req, res) => {
  // Cek apakah permintaan GET ke root
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Server berjalan dengan baik.");
  } 
  // Cek apakah permintaan POST untuk chat
  else if (req.method === "POST" && req.url === "/chat") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const { message } = JSON.parse(body);

        // Jika pesan kosong
        if (!message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Pesan tidak boleh kosong." }));
          return;
        }

        // Cek apakah pesan berhubungan dengan cuaca
        if (message.toLowerCase().includes("cuaca")) {
          getWeather(DEFAULT_CITY, (err, weatherResponse) => {
            if (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Gagal mengambil data cuaca." }));
            } else {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ response: weatherResponse }));
            }
          });
        } else {
          // Jika bukan cuaca, kirim ke OpenAI
          getOpenAIResponse(message, (err, aiResponse) => {
            if (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Gagal memproses permintaan AI." }));
            } else {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ response: aiResponse }));
            }
          });
        }
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Permintaan tidak valid." }));
      }
    });
  } else {
    // Jika endpoint tidak ditemukan
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint tidak ditemukan." }));
  }
});

// Jalankan server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
        
