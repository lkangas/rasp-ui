(function () {
  const controls = document.querySelector(".controls");
  const productSelect = document.getElementById("productSelect");
  const daySlider = document.getElementById("daySlider");
  const timeSlider = document.getElementById("timeSlider");
  const dayLabel = document.getElementById("dayLabel");
  const timeLabel = document.getElementById("timeLabel");
  const imageArea = document.getElementById("imageArea");
  const forecastImage = document.getElementById("forecastImage");
  const spinner = document.getElementById("spinner");
  const nodata = document.getElementById("nodata");

  // cacheKey -> { img: HTMLImageElement, status: "pending" | "loaded" | "error" }
  const cache = new Map();
  let displayedNaturalSize = null; // { w, h } of the currently-shown image

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

  // Every param plus every sounding, grouped in the dropdown.
  function productList() {
    const params = PARAMS.map(([name, title]) => ({ value: name, label: title, group: "Parametrit" }));
    const soundings = SOUNDINGS.map(([name, title]) => ({ value: name, label: title, group: "Luotaukset" }));
    return params.concat(soundings);
  }

  function buildProductSelect() {
    const groups = new Map();
    for (const item of productList()) {
      let parent = groups.get(item.group);
      if (!parent) {
        parent = document.createElement("optgroup");
        parent.label = item.group;
        productSelect.appendChild(parent);
        groups.set(item.group, parent);
      }
      parent.appendChild(new Option(item.label, item.value));
    }
    productSelect.value = DEFAULT_PARAM;
  }

  function preloadProduct(param) {
    for (const day of DAYS) {
      for (const time of TIMES) {
        const key = cacheKey(param, day.value, time.value);
        const existing = cache.get(key);
        // Keep pending/loaded entries as-is; retry ones that previously errored
        // (a 404 for a not-yet-published forecast hour can resolve later).
        if (existing && existing.status !== "error") continue;
        const entry = { img: new Image(), status: "pending" };
        cache.set(key, entry);
        entry.img.onload = () => {
          entry.status = "loaded";
          refreshDisplay();
        };
        entry.img.onerror = () => {
          entry.status = "error";
          refreshDisplay();
        };
        entry.img.src = buildImageUrl(day.value, param, time.value);
      }
    }
  }

  function refreshDisplay() {
    const key = cacheKey(currentParam(), currentDay(), currentTime());
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
      displayedNaturalSize = { w: entry.img.naturalWidth, h: entry.img.naturalHeight };
      syncControlsWidth();
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

  // Keep the controls the same width as the displayed image. Images vary in
  // aspect ratio (area maps vs. cross-sections vs. soundings) and the page's
  // own layout scales them to fit, so the rendered width isn't knowable up
  // front -- compute it the same way object-fit:contain would (scaled to fit
  // the image area's content box, never upscaled past natural size) using
  // the already-decoded image's natural dimensions, rather than reading the
  // <img> element's own box back (which depends on the browser having
  // already committed a render frame, and isn't reliably synchronous).
  function syncControlsWidth() {
    if (!displayedNaturalSize) return;
    const rect = imageArea.getBoundingClientRect();
    const cs = getComputedStyle(imageArea);
    const availW = rect.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = rect.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const scale = Math.min(availW / displayedNaturalSize.w, availH / displayedNaturalSize.h, 1);
    controls.style.width = `${displayedNaturalSize.w * scale}px`;
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

  function onProductChange() {
    preloadProduct(currentParam());
    refreshDisplay();
  }

  productSelect.addEventListener("change", onProductChange);
  daySlider.addEventListener("input", onDayChange);
  timeSlider.addEventListener("input", onTimeChange);
  // Listen on the container, not the <img> itself: the image gets
  // visibility:hidden while pending/errored, and hidden elements don't
  // receive pointer events, which would make click-to-step silently do
  // nothing whenever the current frame isn't loaded yet.
  imageArea.addEventListener("click", (event) => {
    if (event.button !== 0) return;
    stepTime(event.shiftKey ? -1 : 1);
  });

  window.addEventListener("resize", syncControlsWidth);

  function init() {
    daySlider.max = String(DAYS.length - 1);
    timeSlider.max = String(TIMES.length - 1);

    buildProductSelect();

    const defaultTimeIndex = TIMES.findIndex((t) => t.value === DEFAULT_TIME);
    timeSlider.value = String(defaultTimeIndex >= 0 ? defaultTimeIndex : 0);

    onDayChange();
    onTimeChange();
    preloadProduct(currentParam());
  }

  init();
})();
