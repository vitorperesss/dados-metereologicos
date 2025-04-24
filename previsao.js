require('dotenv').config();
const axios = require('axios');
const venom = require('venom-bot');

const numero = '5512999999999@c.us'; // Altere para o seu número com DDI + DDD + número

// Coordenadas de Ilhabela
const LAT = -23.7785;
const LNG = -45.3581;

async function getPrevisaoTempo() {
  try {
    const owmKey = process.env.OPENWEATHERMAP_API_KEY;
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LNG}&units=metric&lang=pt_br&appid=${owmKey}`
    );

    const dados = response.data;

    const tempMin = dados.main.temp_min;
    const tempMax = dados.main.temp_max;
    const vento = dados.wind.speed;
    const direcaoVento = dados.wind.deg;
    const chuva = dados.rain?.['1h'] || 0;

    return {
      tempMin,
      tempMax,
      vento,
      direcaoVento,
      chuva,
    };
  } catch (error) {
    console.error('Erro ao obter dados do tempo:', error.message);
    return null;
  }
}

async function getOndas() {
  try {
    const stormKey = process.env.STORMGLASS_API_KEY;
    const response = await axios.get(
      `https://api.stormglass.io/v2/weather/point`,
      {
        params: {
          lat: LAT,
          lng: LNG,
          params: 'waveHeight,waveDirection,wavePeriod',
          source: 'noaa',
        },
        headers: {
          Authorization: stormKey,
        },
      }
    );

    const horaAtual = new Date().toISOString().split(':')[0] + ':00:00';
    const dados = response.data.hours.find((h) => h.time.includes(horaAtual));

    return {
      altura: dados.waveHeight?.noaa,
      direcao: dados.waveDirection?.noaa,
      periodo: dados.wavePeriod?.noaa,
    };
  } catch (error) {
    console.error('Erro ao obter dados das ondas:', error.message);
    return null;
  }
}

async function montarMensagem() {
  const tempo = await getPrevisaoTempo();
  const ondas = await getOndas();

  if (!tempo || !ondas) {
    return 'Erro ao coletar dados climáticos e marítimos.';
  }

  return `🌤️ *Previsão para Ilhabela-SP*:
- Temperatura: mín ${tempo.tempMin}°C / máx ${tempo.tempMax}°C
- Vento: ${tempo.vento} m/s (direção ${tempo.direcaoVento}°)
- Chuva: ${tempo.chuva} mm (última hora)

🌊 *Ondas*:
- Altura: ${ondas.altura} m
- Direção: ${ondas.direcao}°
- Período: ${ondas.periodo} s
`;
}

venom
  .create({
    session: 'ilhabela',
    multidevice: true,
    folderNameToken: 'tokens',
    headless: true,
  })
  .then(async (client) => {
    const mensagem = await montarMensagem();
    await client.sendText(numero, mensagem);
    console.log('✅ Mensagem enviada com sucesso!');
  })
  .catch((erro) => {
    console.error('Erro no Venom:', erro);
  });
