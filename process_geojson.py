import json


def main():
    geojson = json.load(open('data/new_adm0.geojson'))
    output_geojson_file = 'data/new_adm0_ids_merged.geojson'

    country_codes_set = {
        x['properties']['sr_adm0_a3']
        for i, x in enumerate(geojson['features'])
    }
    country_codes_ids = {x: i+1 for i, x in enumerate(country_codes_set)}

    # Now set id same for each one with same country code
    for feature in geojson['features']:
        code = feature['properties']['sr_adm0_a3']
        feature['id'] = country_codes_ids[code]

    json.dump(geojson, open(output_geojson_file, 'w'), indent=2)
    print('done')


def check_duplicates():
    output_geojson_file = 'data/new_adm0_ids_merged.geojson'
    geojson = json.load(open(output_geojson_file))
    ids = [x['id'] for x in geojson['features']]
    setids = set(ids)
    print(len(ids), len(setids))


# check_duplicates()
main()
