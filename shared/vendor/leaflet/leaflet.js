(function (global) {
  if (global.L && typeof global.L.map === 'function') {
    return;
  }

  const warn = (message) => {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[Leaflet fallback] ${message}`);
    }
  };

  const ensureContainer = (id) => {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el) {
      warn(`Map container "${id}" was not found.`);
      return null;
    }
    if (!el.querySelector('.leaflet-fallback__message')) {
      const message = document.createElement('div');
      message.className = 'leaflet-fallback__message';
      message.innerHTML = `
        <strong>Map unavailable offline</strong>
        <span>Leaflet CDN assets couldn't be loaded. Reconnect to the internet or refresh (Ctrl+F5) to restore the interactive map.</span>
      `;
      el.innerHTML = '';
      el.appendChild(message);
    }
    return el;
  };

  const createMap = (id, options = {}) => {
    const container = ensureContainer(id);
    const state = {
      options,
      layers: new Set(),
      listeners: new Map(),
      center: [0, 0],
      zoom: 0,
    };

    const mapApi = {
      _container: container,
      options,
      addLayer(layer) {
        state.layers.add(layer);
        if (typeof layer.onAdd === 'function') {
          layer.onAdd(mapApi);
        }
        return mapApi;
      },
      removeLayer(layer) {
        state.layers.delete(layer);
        if (typeof layer.onRemove === 'function') {
          layer.onRemove(mapApi);
        }
        return mapApi;
      },
      on(type, handler) {
        if (!state.listeners.has(type)) {
          state.listeners.set(type, new Set());
        }
        state.listeners.get(type).add(handler);
        return mapApi;
      },
      off(type, handler) {
        if (!state.listeners.has(type)) return mapApi;
        state.listeners.get(type).delete(handler);
        return mapApi;
      },
      fire(type, payload) {
        const handlers = state.listeners.get(type);
        if (!handlers) return mapApi;
        handlers.forEach((handler) => handler(payload));
        return mapApi;
      },
      setView(center = [0, 0], zoom = 0) {
        state.center = center.slice();
        state.zoom = zoom;
        return mapApi;
      },
      fitBounds(bounds) {
        if (bounds && typeof bounds.getCenter === 'function') {
          state.center = bounds.getCenter();
        }
        return mapApi;
      },
      invalidateSize() {
        return mapApi;
      },
      getCenter() {
        return state.center.slice();
      },
      getZoom() {
        return state.zoom;
      },
    };

    return mapApi;
  };

  const createLayerGroup = () => {
    const layers = new Set();
    return {
      addLayer(layer) {
        if (layer) {
          layers.add(layer);
        }
        return this;
      },
      removeLayer(layer) {
        layers.delete(layer);
        return this;
      },
      clearLayers() {
        layers.clear();
        return this;
      },
      addTo(map) {
        if (map && typeof map.addLayer === 'function') {
          map.addLayer(this);
        }
        return this;
      },
      removeFrom(map) {
        if (map && typeof map.removeLayer === 'function') {
          map.removeLayer(this);
        }
        return this;
      },
      getLayers() {
        return Array.from(layers);
      },
      onAdd() {},
      onRemove() {},
    };
  };

  const createMarker = (latLng = [0, 0]) => {
    const state = {
      latLng: latLng.slice(),
      popup: null,
    };
    return {
      locationId: undefined,
      addTo(layerOrMap) {
        if (layerOrMap && typeof layerOrMap.addLayer === 'function') {
          layerOrMap.addLayer(this);
        }
        return this;
      },
      bindPopup(content) {
        state.popup = content;
        return this;
      },
      getLatLng() {
        return state.latLng.slice();
      },
      setLatLng(next) {
        state.latLng = next.slice();
        return this;
      },
      openPopup() {
        warn('Popups are unavailable in the offline fallback.');
        return this;
      },
    };
  };

  const createTileLayer = () => {
    return {
      addTo(map) {
        if (map && typeof map.addLayer === 'function') {
          map.addLayer(this);
        }
        return this;
      },
      onAdd(map) {
        if (map && map._container) {
          ensureContainer(map._container);
        }
      },
      onRemove() {},
    };
  };

  const createBounds = (points = []) => {
    const normalized = points.map((point) => point.slice());
    return {
      getCenter() {
        if (!normalized.length) return [0, 0];
        const sum = normalized.reduce(
          (acc, [lat, lng]) => {
            acc[0] += lat;
            acc[1] += lng;
            return acc;
          },
          [0, 0]
        );
        return [sum[0] / normalized.length, sum[1] / normalized.length];
      },
      pad() {
        return this;
      },
    };
  };

  const L = {
    map: createMap,
    layerGroup: createLayerGroup,
    marker: createMarker,
    markerClusterGroup: createLayerGroup,
    tileLayer: createTileLayer,
    latLngBounds: createBounds,
  };

  Object.defineProperty(L, 'version', {
    value: 'fallback-0.1',
    enumerable: true,
  });

  global.L = L;
})(typeof window !== 'undefined' ? window : globalThis);
