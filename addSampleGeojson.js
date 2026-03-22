
// Import required ArcGIS modules
const [
    FeatureLayer,
    esriRequest,
    GroupLayer,
    GeoJSONLayer
] = await $arcgis.import([
    "@arcgis/core/layers/FeatureLayer.js",
    "@arcgis/core/request.js",
    "@arcgis/core/layers/GroupLayer.js",
    "@arcgis/core/layers/GeoJSONLayer.js",
]);

function geojsonToArcGISGeometry(geojson) {
    switch (geojson.type) {
        case "Point":
            return { type: "point", x: geojson.coordinates[0], y: geojson.coordinates[1], z: (geojson.coordinates.length > 2) ? geojson.coordinates[2] : 0, spatialReference: { wkid: 4326 } };
        case "LineString":
            return { type: "polyline", paths: [geojson.coordinates], spatialReference: { wkid: 4326 } };
        case "Polygon":
            let noZCoords = [geojson.coordinates[0].map((c) => [c[0], c[1]])]
            return { type: "polygon", rings: noZCoords, spatialReference: { wkid: 4326 } };
        //return { type: "polygon", rings: geojson.coordinates, spatialReference: { wkid: 4326 } };
        default:
            console.warn("Unsupported geometry type:", geojson.type);
            return null;
    }
}

export async function LoadSampleGeoJSON(map, path, title, color) {
    const geoJsonData = await esriRequest(path, { responseType: "json" });
    const geoJsonGroup = new GroupLayer({
        title: title,
        visible: true,
    });
    map.add(geoJsonGroup);

    /////////Point Layer///////
    const ptFeatures = geoJsonData.data.features.filter((f) => f.geometry.type == "Point").map((f, i) => ({
        // geometry: {
        //     type: "point",
        //     spatialReferenc: { wkid: 4326 },
        //     x: f.geometry.coordinates[0],
        //     y: f.geometry.coordinates[1],
        //     z: (f.geometry.coordinates.length > 2) ? f.geometry.coordinates[2] : 0,
        // },
        geometry: geojsonToArcGISGeometry(f.geometry),
        attributes: {
            OBJECTID: i,
            //icon_url:f.properties.icon_url,
            //mapit_title:f.properties.mapit_title
            z: f.geometry.coordinates[2],
            label: f.properties.point ? (f.properties.point.texts.center ? f.properties.point.texts.center.text : (f.properties.point.texts.top ? f.properties.point.texts.top.text : "")) : f.properties.mapit_title,
            ...f.properties
        }
    }));

    //to do take from manifest
    const iconField = "icon_url";
    const uniqueIcons = [... new Set(ptFeatures.map(f => f.attributes[iconField]))];

    const uniqueValueInfos = [];

    for (const icon of uniqueIcons) {
        let response = await fetch(icon);
        let svgText = await response.text()
        const dataUrl = "data:image/svg+xml;utf8," + encodeURIComponent(svgText);
        // const pictureSymbol = new PictureMarkerSymbol({
        //   url: dataUrl,
        //   width: "20px",
        //   height: "20px"
        // });
        uniqueValueInfos.push({
            value: icon,
            label: icon,
            symbol: {
                type: "picture-marker",
                url: dataUrl,
                width: "60px",
                height: "60px"
            }
        })
    }

    const uniqueValueInfos3D = [];

    for (const icon of uniqueIcons) {
        let response = await fetch(icon);
        let svgText = await response.text()
        const dataUrl = "data:image/svg+xml;utf8," + encodeURIComponent(svgText);
        // const pictureSymbol = new PictureMarkerSymbol({
        //   url: dataUrl,
        //   width: "20px",
        //   height: "20px"
        // });
        uniqueValueInfos3D.push({
            value: icon,
            label: icon,
            symbol: {
                type: "point-3d",
                symbolLayers: [
                    {
                        type: "icon",
                        resource: {
                            href: icon
                        },
                        size: 60
                    }
                ],

                callout: {
                    type: "line",
                    size: 2,
                    color: "white",
                    border: { color: "black" }
                }
				//,
                //verticalOffset: {
                //    screenLength: "150px",
                //    maxWorldLength: 80,
                //    minWorldLength: 20
                //}
            }
        })
    }

    //
    const ptLayer = new FeatureLayer({
        title: "נקודות",
        source: ptFeatures,
        objectIdField: "OBJECTID",
        //to add manifest alias
        fields: [
            { name: "OBJECTID", type: "oid" },
            { name: "label", type: "string" },
            { name: "z", type: "string" },
            ...Object.keys(ptFeatures[0].attributes).map((n) => ({
                name: n,
                alias: n,
                type: "string",
            })),
        ],
        renderer: {
            type: "unique-value",
            field: iconField,
            uniqueValueInfos: uniqueValueInfos,
            defaultSymbol: uniqueValueInfos[0].symbol
        },
        renderer3D: {
            type: "unique-value",
            field: iconField,
            uniqueValueInfos: uniqueValueInfos3D,
            defaultSymbol: uniqueValueInfos[0].symbol
        },
        elevationInfo: {
            //mode: "absolute-height"
			mode: "relative-to-scene"
        },
        labelingInfo: [
            {
                "labelExpressionInfo": {
                    "expression": "$feature.label"//"$feature.point.texts.center.color,"//"$feature.mapit_title"
                },
                "symbol": {
                    "type": "text",
                    "color": color,
                    "size": 12,
                    "haloColor": "black",
                    "haloSize": "1.5"
                },
                "minScale": 50000,
                "maxScale": 0,
                labelPlacement: "above-center",
            }


        ],
    });;
    geoJsonGroup.add(ptLayer);



    /////////Polygon Layer///////
    const polyFeatures = geoJsonData.data.features.filter((f) => f.geometry.type == "Polygon").map((f, i) => ({
        geometry: geojsonToArcGISGeometry(f.geometry),
        attributes: {
            OBJECTID: i,
            //icon_url:f.properties.icon_url,
            //mapit_title:f.properties.mapit_title
            //label: f.properties.point.texts.center? f.properties.point.texts.center.text : (f.properties.point.texts.top? f.properties.point.texts.top.text : "1") ,
            ...f.properties
        }
    }));

    const polyLayer = new FeatureLayer({
        title: "פוליגונים",
        source: polyFeatures,
        objectIdField: "OBJECTID",
        //to add manifest alias
        fields: [
            { name: "OBJECTID", type: "oid" },
            { name: "label", type: "string" },
            ...Object.keys(ptFeatures[0].attributes).map((n) => ({
                name: n,
                alias: n,
                type: "string",
            })),
        ],
        renderer: {
            type: "simple",
            symbol: {

                "type": "simple-fill",
                "color": [
                    255,
                    255,
                    0,
                    0
                ],
                outline: {
                    color: color,
                    width: 1
                }

            }
        },
        elevationInfo: {
            mode: "relative-to-scene"
        }

    });
    geoJsonGroup.add(polyLayer);


    /////////Polygon Layer///////
    const lineFeatures = geoJsonData.data.features.filter((f) => f.geometry.type == "LineString").map((f, i) => ({
        geometry: geojsonToArcGISGeometry(f.geometry),
        attributes: {
            OBJECTID: i,
            //icon_url:f.properties.icon_url,
            //mapit_title:f.properties.mapit_title
            //label: f.properties.point.texts.center? f.properties.point.texts.center.text : (f.properties.point.texts.top? f.properties.point.texts.top.text : "1") ,
            ...f.properties
        }
    }));

    const lineLayer = new FeatureLayer({
        title: "קווים",
        source: lineFeatures,
        objectIdField: "OBJECTID",
        //to add manifest alias
        fields: [
            { name: "OBJECTID", type: "oid" },
            { name: "label", type: "string" },
            ...Object.keys(ptFeatures[0].attributes).map((n) => ({
                name: n,
                alias: n,
                type: "string",
            })),
        ],
        renderer: {
            type: "simple",
            symbol: {

                "type": "simple-line",
                "color": color,
                "style": "short-dot"

            }
        },
        elevationInfo: {
            mode: "relative-to-scene"
        }

    });
    geoJsonGroup.add(lineLayer);
}

export async function LoasSpritePtJson(map, title, jsonPath, spriteJsonPath, spritePath, stylePath) {
    // Load sprite.json
    const spriteData = await (await fetch(spriteJsonPath)).json();
    //const iconField = "f_source_name"; //to do fetch from style

    const spriteImage = new Image();
    spriteImage.crossOrigin = "anonymous";
    spriteImage.src = spritePath;
    const uniqueValueInfos = []


    spriteImage.onload = async () => {

        const stylejson = await (await fetch(stylePath)).json();
        //const arr = stylejson.layers.find(l => l.id == "point-sprite-icon").layout["icon-image"];
        const arr = stylejson.layers.find(l => l.id.includes("icon")).layout["icon-image"];
        const conditions = []
        const fields = []
        const vals = []
        const results = []
        for (let i = 1; i < arr.length; i += 2) {
            const conditionBlock = arr[i];
            const result = arr[i + 1]
            if (Array.isArray(result))
                break;
            conditions.push(conditionBlock);
            fields.push(conditionBlock[1][1])
            vals.push(conditionBlock[2])
            results.push(result);
        }
        console.log(conditions);
        console.log("fields", fields);
        console.log("vals", vals);
        console.log("results", results);

        const uniqueValueInfos = []
        const uniqueValueInfos3D = []
        for (let i = 0; i < fields.length; i++) {
            if(!results[i])
                continue;
            const iconKey = results[i];
            const iconInfo = spriteData[iconKey];
            const canvas = document.createElement("canvas");
            canvas.width = iconInfo.width;
            canvas.height = iconInfo.height;
            const ctx = canvas.getContext("2d");

            ctx.drawImage(
                spriteImage,
                iconInfo.x, iconInfo.y, iconInfo.width, iconInfo.height,
                0, 0, iconInfo.width, iconInfo.height
            );
            const iconDataURL = canvas.toDataURL();
            uniqueValueInfos.push({
                value: vals[i],
                label: vals[i],
                symbol: {
                    type: "picture-marker",
                    url: iconDataURL,
                    width: "40px",
                    height: "40px"
                }
            });
            uniqueValueInfos3D.push({
                value: vals[i],
                label: vals[i],
                symbol: {
                    type: "point-3d",
                    symbolLayers: [
                        {
                            type: "icon",
                            resource: {
                                href: iconDataURL
                            },
                            size: 40
                        }
                    ],

                    callout: {
                        type: "line",
                        size: 2,
                        color: "white",
                        border: { color: "black" }
                    },
                    verticalOffset: {
                        screenLength: "150px",
                        maxWorldLength: 80,
                        minWorldLength: 20
                    }
                }
            });

        }

        const oJSON = new GeoJSONLayer({
            url: jsonPath,
            displayField: "mapit_title",
            title: title,
            //labelsVisible: true,
            // minScale: 150000,
            // labelingInfo: [
            //     {
            //         "labelExpressionInfo": {
            //             "expression": "$feature.mapit_title"
            //         },
            //         symbol: {
            //             type: "text",
            //             color: "blue",
            //             size: 14
            //         },
            //         // labelPlacement: "above-center",
            //         // minScale: 150000,
            //         maxScale: 0    // נמוך = רחוק
            //     }
            // ],

            // "layout": {
            //     "text-field": [
            //         "get",
            //         "call_sign"
            //     ],
            //     "text-font": [
            //         "open-sans-bold"
            //     ],
            //     "text-justify": "center",
            //     "text-anchor": "top",
            //     "text-offset": [
            //         0,
            //         1
            //     ],
            //     "text-size": 14
            // },
            // "paint": {
            //     "text-color": "#51bbd6",
            //     "text-halo-color": "rgb(00,00,00)",
            //     "text-halo-width": 4,
            //     "text-halo-blur": 10
            // }
            labelingInfo: [
                {
                    "labelExpressionInfo": {
                        //"expression": `$feature.${stylejson.layers.find(l =>  l.id.includes("text")).layout["text-field"][1]}`//"$feature.point.texts.center.color,"//"$feature.mapit_title"
                        "expression": `$feature.${stylejson.layers.find(l => l.id.includes("text")).layout["text-field"][1]}`//"$feature.point.texts.center.color,"//"$feature.mapit_title"
                    },
                    "symbol": {
                        "type": "text",
                        "color": stylejson.layers.find(l =>  l.id.includes("text")).paint["text-color"],
                        haloColor: stylejson.layers.find(l =>  l.id.includes("text")).paint["text-halo-color"],
                        haloSize: stylejson.layers.find(l =>  l.id.includes("text")).paint["text-halo-width"] + "px",
                        

                        font: {
                            size: stylejson.layers.find(l =>  l.id.includes("text")).layout["text-size"],
                            //family: stylejson.layers.find(l =>  l.id.includes("text")).layout["text-font"]
                        }
                    },
                    "minScale": 50000,
                    "maxScale": 0,
                    labelPlacement: "above-center",
                }


            ],
            renderer: {
                defaultSymbol: (uniqueValueInfos.find(v => v.value == "o"))?uniqueValueInfos.find(v => v.value == "o").symbol:uniqueValueInfos[0].symbol,
                type: "unique-value",
                field: fields[0],
                uniqueValueInfos: uniqueValueInfos
            },
            renderer3D: {
                defaultSymbol: (uniqueValueInfos.find(v => v.value == "o"))?uniqueValueInfos.find(v => v.value == "o").symbol:uniqueValueInfos[0].symbol,//uniqueValueInfos.find(v => v.value == "o").symbol,
                type: "unique-value",
                field: fields[0],
                uniqueValueInfos: uniqueValueInfos3D
            }

        });

        map.add(oJSON);
    }

}