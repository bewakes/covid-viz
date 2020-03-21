const MAPUTILS = {};

MAPUTILS.createSourceFromCsv = function (csvArray) {
    // properties Meta contains column name and column index in header
    const [header, ...rows] = csvArray;
    // const [prov, country, lat, lon, ...dates] = header;
    const getPointFeature = (row, id) => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [parseFloat(row[3]), parseFloat(row[2])],
        },
        properties: {
            'province': row[0],
            'country': row[1],
            'dateWiseData': row.slice(4).map(x => parseInt(x)),
        },
        id: id,
    });

    return {
        type: 'FeatureCollection',
        features: rows.map(
            (row, index) => getPointFeature(row, index)
        ),
    };
}

MAPUTILS.addCovidLayer = function(id, source) {
    const layer = g_map.getLayer('covid-cases');
    if (!layer) {
        g_map.addLayer({
            'id': id,
            'type': 'circle',
            'source': source,
            'paint': {
                'circle-color': 'red',
                'circle-radius': ['round', ['log2', ['+', 1, ['number', ['feature-state', 'casualties'], 0]]]],
                'circle-opacity': 0.6,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#333',
            }
        });
    }
}
