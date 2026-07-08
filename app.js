(function () {
  const parsetSelect = document.getElementById("parsetSelect");
  const productSelect = document.getElementById("productSelect");
  const daySlider = document.getElementById("daySlider");
  const timeSlider = document.getElementById("timeSlider");
  const dayLabel = document.getElementById("dayLabel");
  const timeLabel = document.getElementById("timeLabel");
  const playBtn = document.getElementById("playBtn");
  const preloadStatus = document.getElementById("preloadStatus");
  const imageArea = document.getElementById("imageArea");
  const forecastImage = document.getElementById("forecastImage");
  const spinner = document.getElementById("spinner");
  const nodata = document.getElementById("nodata");
  const description = document.getElementById("description");

  // cacheKey -> { img: HTMLImageElement, status: "pending" | "loaded" | "error" }
  const cache = new Map();
  let playTimer = null;

  function cacheKey(param, day, time) {
    return `${param}|${day}|${time}`;
  }

  function currentParam() {
    return productSelect.value;
  }

  function currentDay() {
    return DAYS[Number(daySlider.value)].value;
  }

  function currentTime() {
    return TIMES[Number(timeSlider.value)].value;
  }

  // Builds the product list for a given parset index: Perus (0) shows only
  // non-"extra" params; Laaja (1) shows every param plus the soundings.
  function productList(parsetIndex) {
    const params = PARAMS
      .filter(([, , extra]) => parsetIndex >= 1 || !extra)
      .map(([name, title]) => ({ value: name, label: title, group: "Parametrit" }));
    if (parsetIndex < 1) return params;
    const soundings = SOUNDINGS.map(([name, title]) => ({ value: name, label: title, group: "Luotaukset" }));
    return params.concat(soundings);
  }

  function populateParsetSelect() {
    PARSETS.forEach((label, i) => {
      const opt = new Option(label, String(i));
      parsetSelect.add(opt);
    });
  }

  function populateProductSelect(preferredValue) {
    const list = productList(Number(parsetSelect.value));
    const grouped = new Set(list.map((i) => i.group)).size > 1;
    const groups = new Map();
    productSelect.innerHTML = "";
    for (const item of list) {
      let parent = productSelect;
      if (grouped) {
        parent = groups.get(item.group);
        if (!parent) {
          parent = document.createElement("optgroup");
          parent.label = item.group;
          productSelect.appendChild(parent);
          groups.set(item.group, parent);
        }
      }
      parent.appendChild(new Option(item.label, item.value));
    }
    const hasPreferred = list.some((i) => i.value === preferredValue);
    const fallback = list.some((i) => i.value === DEFAULT_PARAM) ? DEFAULT_PARAM : list[0].value;
    productSelect.value = hasPreferred ? preferredValue : fallback;
  }

  function updateDescription() {
    const entry = PARAMS.find(([name]) => name === currentParam());
    description.textContent = entry ? entry[3] : "";
  }

  function preloadProduct(param) {
    let total = 0;
    let done = 0;
    for (const day of DAYS) {
      for (const time of TIMES) {
        const key = cacheKey(param, day.value, time.value);
        const existing = cache.get(key);
        // Keep pending/loaded entries as-is; retry ones that previously errored
        // (a 404 for a not-yet-published forecast hour can resolve later).
        if (existing && existing.status !== "error") continue;
        total++;
        const entry = { img: new Image(), status: "pending" };
        cache.set(key, entry);
        entry.img.onload = () => {
          entry.status = "loaded";
          done++;
          reportProgress(param, done, total);
          refreshDisplay();
        };
        entry.img.onerror = () => {
          entry.status = "error";
          done++;
          reportProgress(param, done, total);
          refreshDisplay();
        };
        entry.img.src = buildImageUrl(day.value, param, time.value);
      }
    }
    if (total === 0) {
      preloadStatus.textContent = "";
    } else {
      reportProgress(param, 0, total);
    }
  }

  function reportProgress(param, done, total) {
    // Ignore progress reports for a product the user has since navigated away from.
    if (param !== currentParam()) return;
    preloadStatus.textContent = done < total
      ? `Ladataan kuvia: ${done}/${total}`
      : "";
  }

  function refreshDisplay() {
    const param = currentParam();
    const day = currentDay();
    const time = currentTime();
    const key = cacheKey(param, day, time);
    const entry = cache.get(key);

    if (!entry) {
      // preloadProduct() always seeds the full day x time grid for the
      // current product synchronously before this runs, so this is only
      // reachable if that invariant is ever broken elsewhere.
      showPending();
      return;
    }

    if (entry.status === "loaded") {
      forecastImage.src = entry.img.src;
      forecastImage.classList.remove("hidden");
      spinner.hidden = true;
      nodata.hidden = true;
    } else if (entry.status === "error") {
      forecastImage.classList.add("hidden");
      spinner.hidden = true;
      nodata.hidden = false;
    } else {
      showPending();
    }
  }

  function showPending() {
    forecastImage.classList.add("hidden");
    spinner.hidden = false;
    nodata.hidden = true;
  }

  function stepTime(delta) {
    const max = TIMES.length - 1;
    let i = Number(timeSlider.value) + delta;
    if (i < 0) i = max;
    else if (i > max) i = 0;
    timeSlider.value = String(i);
    onTimeChange();
  }

  function onDayChange() {
    dayLabel.textContent = DAYS[Number(daySlider.value)].label;
    refreshDisplay();
  }

  function onTimeChange() {
    timeLabel.textContent = TIMES[Number(timeSlider.value)].label;
    refreshDisplay();
  }

  function onParsetChange() {
    populateProductSelect(currentParam());
    updateDescription();
    preloadProduct(currentParam());
    refreshDisplay();
  }

  function onProductChange() {
    updateDescription();
    preloadProduct(currentParam());
    refreshDisplay();
  }

  function setPlaying(playing) {
    playBtn.classList.toggle("active", playing);
    playBtn.textContent = playing ? "❚❚" : "▶";
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
    if (playing) {
      playTimer = setInterval(() => stepTime(1), 900);
    }
  }

  parsetSelect.addEventListener("change", onParsetChange);
  productSelect.addEventListener("change", onProductChange);
  daySlider.addEventListener("input", onDayChange);
  timeSlider.addEventListener("input", onTimeChange);
  playBtn.addEventListener("click", () => setPlaying(!playBtn.classList.contains("active")));
  // Listen on the container, not the <img> itself: the image gets
  // visibility:hidden while pending/errored, and hidden elements don't
  // receive pointer events, which would make click-to-step silently do
  // nothing whenever the current frame isn't loaded yet.
  imageArea.addEventListener("click", (event) => {
    if (event.button !== 0) return;
    stepTime(event.shiftKey ? -1 : 1);
  });

  function init() {
    daySlider.max = String(DAYS.length - 1);
    timeSlider.max = String(TIMES.length - 1);

    populateParsetSelect();
    populateProductSelect(DEFAULT_PARAM);

    const defaultTimeIndex = TIMES.findIndex((t) => t.value === DEFAULT_TIME);
    timeSlider.value = String(defaultTimeIndex >= 0 ? defaultTimeIndex : 0);

    onDayChange();
    onTimeChange();
    updateDescription();
    preloadProduct(currentParam());
  }

  init();
})();
