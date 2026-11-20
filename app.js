(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ids = [
    'initial-pressure', 'target-pressure', 'compressor-power', 'pressure-rate',
    'panel-power', 'sun-hours', 'pv-efficiency', 'battery-capacity',
    'initial-soc', 'reserve-soc',
  ];
  const defaults = {
    'initial-pressure': 25, 'target-pressure': 45, 'compressor-power': 150,
    'pressure-rate': 8, 'panel-power': 120, 'sun-hours': 4,
    'pv-efficiency': 75, 'battery-capacity': 240, 'initial-soc': 80,
    'reserve-soc': 20,
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const value = (id) => Number($(id).value);
  const fmt = (number, digits = 1) => Number(number).toLocaleString('es-CO', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

  let currentSoc = value('initial-soc');
  let cycleCount = 0;
  let lastEnergy = 0;
  let timer = null;

  function setMessage(message, type = '') {
    const box = $('result-message');
    box.className = `result-message ${type}`.trim();
    box.querySelector('p').textContent = message;
  }

  function calculations() {
    const panel = Math.max(0, value('panel-power'));
    const peakSunHours = Math.max(0, value('sun-hours'));
    const pvEfficiency = clamp(value('pv-efficiency'), 0, 100) / 100;
    const capacity = Math.max(0, value('battery-capacity'));
    const reserve = clamp(value('reserve-soc'), 0, 99);
    const power = Math.max(0, value('compressor-power'));
    const rate = Math.max(0.1, value('pressure-rate'));
    const pressureDelta = Math.max(0, value('target-pressure') - value('initial-pressure'));
    const minutes = pressureDelta / rate;
    const cycleWh = power * minutes / 60;
    const generationWh = panel * peakSunHours * pvEfficiency;
    const usableWh = Math.max(0, capacity * (currentSoc - reserve) / 100);
    return {
      panel, peakSunHours, pvEfficiency, capacity, reserve, power, rate,
      pressureDelta, minutes, cycleWh, generationWh, usableWh,
      cyclesAvailable: cycleWh > 0 ? Math.floor(usableWh / cycleWh) : 0,
      solarEquivalentCycles: cycleWh > 0 ? generationWh / cycleWh : 0,
    };
  }

  function updateEnergy() {
    const c = calculations();
    $('daily-generation').innerHTML = `${fmt(c.generationWh, 0)} <small>Wh/día</small>`;
    $('generation-bar').style.width = `${clamp(c.generationWh / Math.max(1, c.capacity) * 100, 0, 100)}%`;
    $('cycle-consumption').innerHTML = `${fmt(lastEnergy, 2)} <small>Wh</small>`;
    $('consumption-bar').style.width = `${clamp(lastEnergy / Math.max(1, c.generationWh) * 100, 0, 100)}%`;
    $('cycles-available').innerHTML = `${c.cyclesAvailable} <small>ciclos</small>`;
    $('solar-equivalent-cycles').innerHTML = `${fmt(c.solarEquivalentCycles, 1)} <small>ciclos/día</small>`;
    $('soc-result').innerHTML = `${fmt(currentSoc, 1)} <small>%</small>`;
    $('battery-visual-fill').style.width = `${clamp(currentSoc, 0, 100)}%`;
    $('battery-visual-label').textContent = `${fmt(currentSoc, 0)}%`;
    $('strip-panel').textContent = `${fmt(c.panel, 0)} Wp`;
    $('strip-battery').textContent = `${fmt(c.capacity, 0)} Wh`;
    $('strip-compressor').textContent = `${fmt(c.power, 0)} W`;
    $('generation-bar').parentElement.setAttribute('aria-valuenow', String(Math.round(clamp(c.generationWh / Math.max(1, c.capacity) * 100, 0, 100))));
    $('consumption-bar').parentElement.setAttribute('aria-valuenow', String(Math.round(clamp(lastEnergy / Math.max(1, c.generationWh) * 100, 0, 100))));
  }

  function resetSimulationDisplay() {
    $('current-pressure').textContent = fmt(value('initial-pressure'));
    $('initial-readout').textContent = `${fmt(value('initial-pressure'), 0)} PSI`;
    $('target-readout').textContent = fmt(value('target-pressure'), 0);
    $('target-label').textContent = `${fmt(value('target-pressure'), 0)} PSI`;
    $('pressure-progress').style.width = '0%';
    $('progress-percent').textContent = '0%';
    $('time-result').innerHTML = '— <small>min</small>';
    $('energy-result').innerHTML = '— <small>Wh</small>';
    $('simulation-state').textContent = 'LISTO PARA SIMULAR';
    lastEnergy = 0;
    updateEnergy();
  }

  function cancelActiveCycle() {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
    $('run-simulation').disabled = false;
    $('run-simulation').innerHTML = '<span>▶</span> Iniciar simulación';
    $('simulation-state').textContent = 'CICLO DETENIDO';
    setMessage('El ciclo se detuvo al cambiar un parámetro. Vuelve a iniciarlo para usar los valores actuales.');
  }

  ids.forEach((id) => $(id).addEventListener('input', () => {
    if (timer !== null) cancelActiveCycle();
    if (id === 'initial-soc') currentSoc = clamp(value(id), 0, 100);
    if (['initial-pressure', 'target-pressure', 'pressure-rate', 'compressor-power'].includes(id)) {
      resetSimulationDisplay();
    } else {
      updateEnergy();
    }
  }));

  $('sim-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (timer !== null) window.clearInterval(timer);
    const c = calculations();
    const initial = value('initial-pressure');
    const target = value('target-pressure');
    if (![initial, target, c.power, c.rate].every(Number.isFinite) || initial < 0 || target <= initial || c.power <= 0 || c.rate <= 0) {
      $('simulation-state').textContent = 'REVISA LOS PARÁMETROS';
      setMessage('La presión objetivo debe superar la inicial. Potencia y ritmo deben ser mayores que cero.', 'warning');
      return;
    }
    if (c.cycleWh > c.usableWh + 1e-9) {
      $('simulation-state').textContent = 'ENERGÍA INSUFICIENTE';
      setMessage(`El ciclo requiere ${fmt(c.cycleWh, 2)} Wh y hay ${fmt(c.usableWh, 2)} Wh disponibles antes de la reserva.`, 'warning');
      lastEnergy = c.cycleWh;
      updateEnergy();
      return;
    }

    lastEnergy = c.cycleWh;
    $('time-result').innerHTML = `${fmt(c.minutes, 2)} <small>min</small>`;
    $('energy-result').innerHTML = `${fmt(c.cycleWh, 2)} <small>Wh</small>`;
    $('simulation-state').textContent = 'INFLADO EN PROGRESO';
    setMessage('Avance visual acelerado para presentación; la duración mostrada es el tiempo idealizado del modelo.');
    const started = performance.now();
    const animationMs = clamp(c.minutes * 450, 1200, 9000);
    const button = $('run-simulation');
    button.disabled = true;
    button.innerHTML = '<span>◌</span> Simulando…';
    timer = window.setInterval(() => {
      const progress = clamp((performance.now() - started) / animationMs, 0, 1);
      $('pressure-progress').style.width = `${progress * 100}%`;
      $('progress-percent').textContent = `${Math.round(progress * 100)}%`;
      $('current-pressure').textContent = fmt(initial + c.pressureDelta * progress);
      if (progress >= 1) {
        window.clearInterval(timer);
        timer = null;
        currentSoc = clamp(currentSoc - c.cycleWh / Math.max(1, c.capacity) * 100, c.reserve, 100);
        cycleCount += 1;
        $('simulation-state').textContent = 'CICLO COMPLETADO';
        $('current-pressure').textContent = fmt(target);
        $('cycle-counter').textContent = `CICLOS SIMULADOS: ${cycleCount}`;
        setMessage(`Inflado simulado hasta ${fmt(target, 0)} PSI. Consumo estimado: ${fmt(c.cycleWh, 2)} Wh.`, 'success');
        button.disabled = false;
        button.innerHTML = '<span>▶</span> Simular otro ciclo';
        updateEnergy();
      }
    }, 60);
  });

  $('reset-battery').addEventListener('click', () => {
    if (timer !== null) cancelActiveCycle();
    currentSoc = clamp(value('initial-soc'), 0, 100);
    $('simulation-state').textContent = 'CARGA INICIAL RESTABLECIDA';
    setMessage('La batería volvió al porcentaje inicial configurado. Los ciclos completados se conservan.');
    updateEnergy();
  });

  $('reset-assumptions').addEventListener('click', () => {
    if (timer !== null) cancelActiveCycle();
    ids.forEach((id) => { $(id).value = defaults[id]; });
    currentSoc = defaults['initial-soc'];
    cycleCount = 0;
    $('cycle-counter').textContent = 'CICLOS SIMULADOS: 0';
    resetSimulationDisplay();
    $('simulation-state').textContent = 'SUPUESTOS RESTABLECIDOS';
    setMessage('Se restauraron los valores ilustrativos iniciales. No son mediciones reales.');
  });

  $('download-summary').addEventListener('click', () => {
    const c = calculations();
    const text = [
      'HUB DE MICROMOVILIDAD SOSTENIBLE — RESUMEN DEL ESCENARIO',
      'Prototipo digital académico · Sin conexión con hardware físico',
      '',
      `Presión inicial: ${fmt(value('initial-pressure'), 0)} PSI`,
      `Presión objetivo: ${fmt(value('target-pressure'), 0)} PSI`,
      `Ritmo idealizado: ${fmt(c.rate, 1)} PSI/min`,
      `Duración estimada: ${fmt(c.minutes, 2)} min`,
      `Potencia supuesta del compresor: ${fmt(c.power, 0)} W`,
      `Energía estimada por ciclo: ${fmt(c.cycleWh, 2)} Wh`,
      '',
      `Panel supuesto: ${fmt(c.panel, 0)} Wp`,
      `Horas sol pico: ${fmt(c.peakSunHours, 1)} h/día`,
      `Rendimiento global: ${fmt(c.pvEfficiency * 100, 0)} %`,
      `Generación solar estimada: ${fmt(c.generationWh, 0)} Wh/día`,
      `Batería nominal: ${fmt(c.capacity, 0)} Wh`,
      `Carga actual simulada: ${fmt(currentSoc, 1)} %`,
      `Reserva mínima: ${fmt(c.reserve, 0)} %`,
      `Ciclos estimados antes de reserva: ${c.cyclesAvailable}`,
      `Ciclos completados en esta sesión: ${cycleCount}`,
      '',
      'LIMITACIÓN: modelo simplificado con potencia y ritmo de inflado constantes. Valores ilustrativos, no mediciones ni dimensionamiento validado. Herramientas, USB y hardware físico no están implementados.',
      'Fórmulas: tiempo = (presión objetivo − presión inicial) / ritmo; energía = potencia × tiempo / 60; generación diaria = potencia pico × horas sol pico × rendimiento.',
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'resumen-escenario-hub-micromovilidad.txt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  ids.forEach((id) => $(id).value = defaults[id]);
  currentSoc = defaults['initial-soc'];
  resetSimulationDisplay();
})();

