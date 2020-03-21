const confirmed_csv_path = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv'
const deaths_csv_path = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv'
const recovered_csv_path = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv'

function getCSVFromUrl(url) {
    // Try and get from localstorage
    // TODO: check cache time as well(store timestamp and check timestamp to
    // decide if fetch or not)
    let rawdata = localStorage.getItem(url);
    if(rawdata) {
        console.warn('found in local storage');
        return new Promise(resolve => {
            resolve(UTILS.CSVToArray(rawdata));
        });
    }
    console.warn('not found in local storage');
    const txtPromise = fetch(url).then(response => response.text())

    return Promise.resolve(txtPromise).then(strdata => {
        localStorage.setItem(url, strdata);
        return UTILS.CSVToArray(strdata);
    });
}

function startAnimation() {
    let features = g_map.queryRenderedFeatures({'layers': ['covid-cases']});
    if (g_config.tick >= g_dates.length) {
        document.getElementById('play-pause').innerHTML = 'Replay';
        g_config.play = false;
        g_config.tick = 0;
    }
    if (!g_config.play) return;

    document.getElementById('stats').style.display = 'block';
    document.getElementById('date').innerHTML = g_dates[g_config.tick];

    g_sourceData.features.map(feature => {
        g_map.setFeatureState(
            {source: 'covid-data', id: feature.id},
            {casualties: g_sourceData.features[feature.id].properties.dateWiseData[g_config.tick]},
        )
    });
    g_config.tick += 1;
    setTimeout(startAnimation, 500*5/g_config.speed);
}


function init() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiYmV3YWtlcyIsImEiOiJjazBkbjdmamYwNngwM2R0aWNsdjMxNmx6In0.ERNabyHQRpdIkC2NUBjtcA';
    g_map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/bewakes/ck7ycdidh0qms1intl5lvja3y',
        renderWorldCopies: false,
    });

    g_map.on('load', async function() {
        const csvdata = await getCSVFromUrl(confirmed_csv_path);
        g_dates = csvdata[0].slice(4).map(x => (new Date(x)).toDateString());
        // Set the global sourceData
        g_sourceData = MAPUTILS.createSourceFromCsv(csvdata);

        g_map.addSource('covid-data', {
            type: 'geojson',
            data: g_sourceData,
        });
        g_map.addLayer({
            'id': 'covid-cases',
            'type': 'circle',
            'source': 'covid-data',
            'paint': {
                // 'circle-color': '#00b7bf',
                'circle-color': 'red',
                'circle-radius': ['round', ['log2', ['+', 1, ['number', ['feature-state', 'casualties'], 0]]]],
                'circle-opacity': 0.6,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#333',
            }
        });
        startAnimation();
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
}
