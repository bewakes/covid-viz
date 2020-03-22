const DATA_TYPES_URLS = {
    confirmed: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv',
    deaths: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv',
    recovered: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv',
};

const DATA_TYPE_COLORS = {
    confirmed: '#FF4500',
    deaths: 'red',
    recovered: 'lightgreen',
};

function getCSVFromUrl(url) {
    // Try and get from localstorage
    // TODO: check cache time as well(store timestamp and check timestamp to
    // decide if fetch or not)
    let rawdata = localStorage.getItem(url);
    if(rawdata) {
        const currTimestamp = new Date().getTime();
        const storedTimestamp = parseInt(localStorage.getItem('cache_timestamp'));
        if(currTimestamp - storedTimestamp < (g_config.cache_time_minutes || 30) * 60 * 1000) {
            console.warn('Latest data found in local storage');
            return new Promise(resolve => {
                resolve(UTILS.CSVToArray(rawdata));
            });
        }
    }
    console.warn('Latest data not found in local storage');
    const txtPromise = fetch(url).then(response => response.text())

    return Promise.resolve(txtPromise).then(strdata => {
        localStorage.setItem(url, strdata);
        localStorage.setItem('cache_timestamp', new Date().getTime());
        return UTILS.CSVToArray(strdata);
    });
}

function createSlider(dates) {
    if(document.getElementById('date-slider')) {
        return;
    }
    const sliderContainer = document.getElementById('slider-container');
    const lendates = dates.length;
    const rangeMax = lendates - 1;
    const slider = document.createElement('input');
    slider.setAttribute('type', 'range');
    slider.setAttribute('id', 'date-slider');
    slider.setAttribute('min', 0);
    slider.setAttribute('disabled', '');
    slider.setAttribute('max', rangeMax);
    slider.setAttribute('step', 1);
    slider.style.width = '90%';

    // Add event listener, to change date value when slided
    slider.addEventListener('input', function(e) {
        g_config.tick = parseInt(e.target.value);
        updateFeaturesState();
        // Fire date-change event for date h3 element
        const dateChangeEvent = new CustomEvent('date-change', {detail: g_dates[e.target.value]});
        document.getElementById('date').dispatchEvent(dateChangeEvent);
        // Fire close popups for map
        g_map.fire('closePopups');
    });

    sliderContainer.appendChild(slider);
}

function updateFeaturesState() {
    g_sourceData.features.map(feature => {
        g_map.setFeatureState(
            {source: 'covid-data', id: feature.id},
            {casualties: g_sourceData.features[feature.id].properties.dateWiseData[g_config.tick]},
        )
    });
}

function startAnimation() {
    let features = g_map.queryRenderedFeatures({'layers': ['covid-cases']});
    if (g_config.tick >= g_dates.length) {
        document.getElementById('play-pause').innerHTML = '↻';
        // Enable sliding again
        document.getElementById('date-slider').removeAttribute('disabled');
        g_config.play = false;
        g_config.tick = 0;
        return;
    }
    if (!g_config.play) return;

    document.getElementById('stats-container').style.display = 'block';
    document.getElementById('date').innerHTML = g_dates[g_config.tick];

    updateFeaturesState();

    document.getElementById('date-slider').value = g_config.tick;
    g_config.tick += 1;
    g_timeout = setTimeout(startAnimation, 500*5/g_config.speed);
}


function getData(data_type) {
    const color = DATA_TYPE_COLORS[data_type];

    getCSVFromUrl(DATA_TYPES_URLS[data_type])
        .then(csvdata => {
            g_dates = csvdata[0].slice(4).map(x => (new Date(x)).toDateString());
            // Set the global sourceData
            g_sourceData = MAPUTILS.createSourceFromCsv(csvdata);
            createSlider(g_dates);
            const source = g_map.getSource('covid-data');
            g_config.tick = 0;
            g_config.play = true;
            if (source) {
                source.setData(g_sourceData);
            }
            else {
                g_map.addSource('covid-data', {
                    type: 'geojson',
                    data: g_sourceData,
                });
                MAPUTILS.addCovidLayer('covid-cases', 'covid-data');
            }
            g_map.setPaintProperty('covid-cases', 'circle-color', color);
            // Clear timeout
            clearTimeout(g_timeout);
            startAnimation();
        });
}


function init() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiYmV3YWtlcyIsImEiOiJjazBkbjdmamYwNngwM2R0aWNsdjMxNmx6In0.ERNabyHQRpdIkC2NUBjtcA';
    g_map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/bewakes/ck7ycdidh0qms1intl5lvja3y',
        renderWorldCopies: false,
        center: [-20, 0],
    });

    g_map.on('load', function() {
        getData(document.getElementById('data-type').value);
    });

    g_map.on('click', 'covid-cases', function(e) {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const province = e.features[0].properties.province;
        const country = e.features[0].properties.country;

        if(!g_config.play) {
            g_map.__popup = new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(`${country}, ${province}<hr/>${e.features[0].state.casualties}`)
            g_map.__popup.addTo(g_map);
        }
    });

    // Change the cursor to a pointer when the mouse is over the covid-cases layer.
    g_map.on('mouseenter', 'covid-cases', function() {
        g_map.getCanvas().style.cursor = 'pointer';
    });

    // Change it back to a pointer when it leaves.
    g_map.on('mouseleave', 'covid-cases', function() {
        g_map.getCanvas().style.cursor = '';
    });

    // Custom event listener to close popups
    g_map.on('closePopups', () => {
        if(g_map.__popup) {
            g_map.__popup.remove();
        }
    });

    // Custom event listener for our date display
    document.getElementById('date').addEventListener('date-change', function(e) {
        e.target.innerHTML = e.detail;
    });

    // On change event listener for data_type selector
    document.getElementById('data-type').addEventListener('change', function(e) {
        const value = e.target.value;
        getData(value);
    });
}
