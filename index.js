const confirmed_csv_path = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv'
const deaths_csv_path = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv'
const recovered_csv_path = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv'


function CSVToArray(strData, strDelimiter) {
        // Check to see if the delimiter is defined. If not,
        // then default to comma.
        strDelimiter = (strDelimiter || ",");
        // Create a regular expression to parse the CSV values.
        var objPattern = new RegExp(
            (
                // Delimiters.
                "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

                // Quoted fields.
                "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

                // Standard fields.
                "([^\"\\" + strDelimiter + "\\r\\n]*))"
            ),
            "gi"
            );
        // Create an array to hold our data. Give the array
        // a default empty first row.
        var arrData = [[]];
        // Create an array to hold our individual pattern
        // matching groups.
        var arrMatches = null;
        // Keep looping over the regular expression matches
        // until we can no longer find a match.
        while (arrMatches = objPattern.exec( strData )){
            // Get the delimiter that was found.
            var strMatchedDelimiter = arrMatches[ 1 ];
            // Check to see if the given delimiter has a length
            // (is not the start of string) and if it matches
            // field delimiter. If id does not, then we know
            // that this delimiter is a row delimiter.
            if (
                strMatchedDelimiter.length &&
                strMatchedDelimiter !== strDelimiter
                ){
                // Since we have reached a new row of data,
                // add an empty row to our data array.
                arrData.push( [] );
            }
            var strMatchedValue;
            // Now that we have our delimiter out of the way,
            // let's check to see which kind of value we
            // captured (quoted or unquoted).
            if (arrMatches[ 2 ]){
                // We found a quoted value. When we capture
                // this value, unescape any double quotes.
                strMatchedValue = arrMatches[ 2 ].replace(
                    new RegExp( "\"\"", "g" ),
                    "\""
                    );
            } else {

                // We found a non-quoted value.
                strMatchedValue = arrMatches[ 3 ];
            }
            // Now that we have our value string, let's add
            // it to the data array.
            arrData[ arrData.length - 1 ].push( strMatchedValue );
        }
        // Return the parsed data.
        return( arrData );
    }


async function getCSVFromUrl(url) {
    // Try and get from localstorage
    // TODO: check cache time as well(store timestamp and check timestamp to
    // decide if fetch or not)
    let rawdata = localStorage.getItem(url);
    if(rawdata) {
        console.warn('found in local storage');
        return CSVToArray(rawdata);
    }
    console.warn('not found in local storage');
    const response = await fetch(url);
    const strdata = await response.text();
    localStorage.setItem(url, strdata);
    return CSVToArray(strdata);
}

function zip(arr1, arr2) {
    let basearr = arr2;
    let otherarr = arr1;
    if (arr1.length < arr2.length) { basearr = arr1; otherarr = arr2;}
    const result = [];
    for(let i=0;i<basearr.length;i++) {
        result.push([basearr[i], otherarr[i]]);
    }
    return result;
};

function zipWith(binaryFunc, arr1, arr2) {
    let basearr = arr2;
    let otherarr = arr1;
    if (arr1.length < arr2.length) { basearr = arr1; otherarr = arr2;}
    const result = [];
    for(let i=0;i<basearr.length;i++) {
        result.push(binaryFunc(basearr[i], otherarr[i]));
    }
    return result;
};

function add(x, y) { return x + y; }

function processCSVArray(array) {
    const countries_data = {};
    const COUNTRY_INDEX = 1;
    headers = array[0];
    let [a, b, c, d, ...dates] = headers;
    for(let row=1; row<array.length; row++) {
        const country = array[row][COUNTRY_INDEX];
        let [p, c, l, n, ...dateWiseData] = array[row];
        dateWiseData = dateWiseData.map(x => parseInt(x));
        if (countries_data[country] === undefined) {

            countries_data[country] = dateWiseData.map(_ => 0);
        }
        countries_data[country] = zipWith(add, countries_data[country], dateWiseData);
    }
    countries_data['DATES'] = dates;
    return countries_data;
}


async function init(config) {
    const data = await getCSVFromUrl(confirmed_csv_path);
    const processed = processCSVArray(data)
    let source;

    document.getElementById('play-pause').addEventListener('click', function(e) {
        if (config.done) {
            config.play = false;
            config.tick = 0;
        }
        config.play  = !config.play;
        if (config.play) startAnimation();
        e.target.innerHTML = !config.play ? 'Play': 'Pause';
    })

    function waitForSource(timestamp) {
        source = map.getSource('states');
        if (source === undefined) {
            setTimeout(waitForSource, 500);
        } else {
            startAnimation(0);
        }
    }

    let notFoundlog = false;

    function startAnimation() {
        // Iterate through all possible ids
        let features = map.queryRenderedFeatures({layers: ['states-layer']});
        if (features.length == 0) {
            setTimeout(startAnimation, 500*5/config.speed);
            return;
        }
        if (!config.play) return;
        // TODO: replace hardcode value
        if (config.tick >= processed['DATES'].length) {
            document.getElementById('play-pause').innerHTML = 'Replay';
            config.done = true;
            return;
        }

        document.getElementById('stats').style.display = 'block';
        document.getElementById('date').innerHTML = (new Date(processed['DATES'][config.tick])).toDateString();
        features.map(feature => {
            const code = feature.properties.sr_adm0_a3;
            const country = CODE_COUNTRIES_MAP[code];
            if(processed[country] !== undefined) {
                map.setFeatureState(
                    {source: 'states', id: feature.id},
                    {casualties: processed[country][config.tick]},
                )
            }
        });
        config.tick += 1;
        setTimeout(startAnimation, 500*5/config.speed);
    }

    mapboxgl.accessToken = 'pk.eyJ1IjoiYmV3YWtlcyIsImEiOiJjazBkbjdmamYwNngwM2R0aWNsdjMxNmx6In0.ERNabyHQRpdIkC2NUBjtcA';
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/bewakes/ck7ycdidh0qms1intl5lvja3y',
    });
    map.on('load', function() {
        // Add a source for the state polygons.
        map.addSource('states', {
        'type': 'geojson',
        // 'data': 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_scale_rank.geojson',
        'data': 'http://localhost:8888/new_adm0_ids_merged.geojson',
        });

        // Add a layer showing the state polygons.
        map.addLayer({
            'id': 'states-layer',
            'type': 'fill',
            'source': 'states',
            'paint': {
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['number', ['feature-state', 'casualties'], 0],
                    0,
                    '#03c04a',
                    500,
                    'orange',
                    5000,
                    'red',
                ],
                'fill-outline-color': '#555555'
            }
        });

        // When a click event occurs on a feature in the states layer, open a popup at the
        // location of the click, with description HTML from its properties.
        map.on('click', 'states-layer', function(e) {
            var casualties = e.features[0].state.casualties || 0;
            map.setFeatureState({
                source: 'states',
                id: e.features[0].id,
            }, {
                casualties: casualties+1
            });
            new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(e.features[0].properties.sr_sov_a3)
            .addTo(map);
            });

        // Change the cursor to a pointer when the mouse is over the states layer.
        map.on('mouseenter', 'states-layer', function() {
            map.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
        map.on('mouseleave', 'states-layer', function() {
            map.getCanvas().style.cursor = '';
        });
    });
    setTimeout(waitForSource, 500);
}
