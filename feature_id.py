import json


def main():
    with open('ne_110m_admin_0_scale_rank.geojson') as f:
        data = json.load(f)
        for i, feature in enumerate(data['features']):
            feature['id'] = i + 1
    json.dump(data, open('new_adm0.geojson', 'w'), indent=2)
    print('done')


if __name__ == '__main__':
    main()
