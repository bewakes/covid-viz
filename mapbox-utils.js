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
